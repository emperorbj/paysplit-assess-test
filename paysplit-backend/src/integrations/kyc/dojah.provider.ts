import { logger } from "../../lib/logger.js"
import {
  KycProviderError,
  type BankIdMethod,
  type DocumentCheckResult,
  type DocumentType,
  type IdentityLookupResult,
  type KycProvider,
  type LivenessResult,
} from "./kyc-provider.js"

export type DojahConfig = {
  baseUrl: string
  appId: string
  secretKey: string
  timeoutMs?: number
  /**
   * The sandbox answers liveness and document checks with one fixed reply for
   * every image (always "spoof" and always "INVALID"), so those verdicts mean
   * nothing there. When true and the base URL is the sandbox, we still call
   * Dojah and still require a face / a document to be detected, but ignore the
   * canned verdict. Has no effect against the live API.
   */
  sandboxTrustChecks?: boolean
}

type DojahResponse<T> = { entity?: T; error?: string }

/**
 * Dojah (https://docs.dojah.io). Auth is two headers: `AppId` and
 * `Authorization: <secret key>` (no "Bearer"). Sandbox: https://sandbox.dojah.io,
 * which only knows the published test values (BVN 22222222222, NIN 70123456789).
 */
export function createDojahProvider(config: DojahConfig): KycProvider {
  const lenientSandbox =
    (config.sandboxTrustChecks ?? true) &&
    new URL(config.baseUrl).hostname.includes("sandbox")

  async function request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown
  ): Promise<{ status: number; data: DojahResponse<T> }> {
    const url = `${config.baseUrl.replace(/\/+$/, "")}${path}`
    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers: {
          AppId: config.appId,
          Authorization: config.secretKey,
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(config.timeoutMs ?? 30_000),
      })
    } catch (error) {
      logger.warn({ err: error, path }, "Dojah request failed")
      throw new KycProviderError("Could not reach the verification service")
    }

    const data = (await response.json().catch(() => ({}))) as DojahResponse<T>
    // 401/403: our keys are wrong; 402: no credit; 5xx: their outage. Not the user's fault.
    if ([401, 402, 403].includes(response.status) || response.status >= 500) {
      logger.error(
        { status: response.status, path, error: data.error },
        "Dojah rejected request"
      )
      throw new KycProviderError(
        "The verification service is unavailable",
        response.status
      )
    }
    return { status: response.status, data }
  }

  async function lookupBankIdentity(
    method: BankIdMethod,
    idNumber: string
  ): Promise<IdentityLookupResult> {
    const path =
      method === "bvn"
        ? `/api/v1/kyc/bvn/full?bvn=${encodeURIComponent(idNumber)}`
        : `/api/v1/kyc/nin?nin=${encodeURIComponent(idNumber)}`
    const { status, data } = await request<Record<string, unknown>>("GET", path)
    const entity = data.entity
    if (status >= 400 || !entity) {
      return {
        found: false,
        reason:
          data.error ?? `We couldn't find a record for that ${method.toUpperCase()}`,
      }
    }
    // BVN uses first_name/last_name; some NIN payloads use firstname/surname.
    const firstName = String(entity.first_name ?? entity.firstname ?? "")
    const lastName = String(entity.last_name ?? entity.surname ?? entity.lastname ?? "")
    if (!firstName && !lastName) {
      return { found: false, reason: "The record returned no name to verify against" }
    }
    return { found: true, firstName, lastName, reference: null }
  }

  async function checkDocument(input: {
    documentType: DocumentType
    front: Buffer
    back?: Buffer | undefined
  }): Promise<DocumentCheckResult> {
    type Analysis = {
      status?: { overall_status?: number; reason?: string; document_type?: string }
      document_type?: { document_name?: string }
    }
    const { status, data } = await request<Analysis>(
      "POST",
      "/api/v1/document/analysis",
      {
        input_type: "base64",
        document_type: input.documentType === "passport" ? "PASSPORT" : "DRIVING_LICENSE",
        imagefrontside: input.front.toString("base64"),
        ...(input.back ? { imagebackside: input.back.toString("base64") } : {}),
      }
    )
    const result = data.entity?.status
    const recognised = status < 400 && Boolean(data.entity?.document_type?.document_name)
    const valid =
      status < 400 && (result?.overall_status === 1 || result?.reason === "VALID")
    if (!valid && lenientSandbox && recognised) {
      logger.warn(
        "Dojah sandbox: accepting a recognised document despite the canned verdict"
      )
    } else if (!valid) {
      return {
        valid: false,
        reason:
          data.error ??
          "We couldn't validate that document. Use a clear, uncropped photo.",
      }
    }
    return {
      valid: true,
      reference: null,
      documentName: data.entity?.document_type?.document_name ?? null,
    }
  }

  async function checkLiveness(selfie: Buffer): Promise<LivenessResult> {
    // The API returns `face.detected` and `liveness: { spoof, confidence }`;
    // the docs describe `face_detected` and `liveness_check`. Accept both.
    type Liveness = {
      liveness?: {
        spoof?: boolean
        confidence?: number
        liveness_check?: boolean
        liveness_probability?: number
      }
      face?: {
        detected?: boolean
        face_detected?: boolean
        multiface_detected?: boolean
        message?: string
      }
    }
    const { status, data } = await request<Liveness>("POST", "/api/v1/ml/liveness", {
      image: selfie.toString("base64"),
    })
    const entity = data.entity
    if (status >= 400 || !entity) {
      return {
        passed: false,
        code: "LIVENESS_FAILED",
        reason: data.error ?? "We couldn't check that photo",
      }
    }
    const faceDetected = entity.face?.detected ?? entity.face?.face_detected
    if (faceDetected !== true)
      return { passed: false, code: "NO_FACE_DETECTED", reason: "No face was detected" }
    if (entity.face?.multiface_detected)
      return {
        passed: false,
        code: "MULTIPLE_FACES",
        reason: "More than one face was detected",
      }
    const live =
      entity.liveness?.liveness_check === true || entity.liveness?.spoof === false
    if (!live && lenientSandbox) {
      logger.warn(
        "Dojah sandbox: accepting a detected face despite the canned spoof verdict"
      )
    } else if (!live) {
      return {
        passed: false,
        code: "LIVENESS_FAILED",
        reason: "This didn't look like a live photo",
      }
    }
    const confidence =
      entity.liveness?.liveness_probability ?? entity.liveness?.confidence
    return { passed: true, probability: confidence ?? null, reference: null }
  }

  return { name: "dojah", lookupBankIdentity, checkDocument, checkLiveness }
}
