import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DojahError } from './dojah.error';
import {
  BvnValidationResult,
  DocumentAnalysisResult,
  DojahDocumentType,
  DojahPersonRecord,
  FaceCompareResult,
  LivenessResult,
  SelfieVerificationResult,
} from './dojah.types';

type Json = Record<string, unknown>;

/** Statuses Dojah says are safe to retry. */
const RETRYABLE_STATUSES = new Set([408, 424, 429, 500, 502, 503, 504]);
const REQUEST_TIMEOUT_MS = 20_000;
const RETRY_DELAY_MS = 1_000;

const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
const num = (value: unknown): number | null => {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};
const obj = (value: unknown): Json =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {};

/**
 * Thin client for the Dojah KYC API (https://docs.dojah.io).
 *
 * Images are sent as raw base64 (no data-URI prefix). Identifiers, images and
 * raw responses are never logged.
 */
@Injectable()
export class DojahService {
  private readonly logger = new Logger(DojahService.name);
  private readonly baseUrl: string;
  private readonly appId: string;
  private readonly secretKey: string;

  constructor(configService: ConfigService) {
    this.baseUrl = configService.get<string>('dojah.baseUrl', 'https://sandbox.dojah.io');
    this.appId = configService.get<string>('dojah.appId', '');
    this.secretKey = configService.get<string>('dojah.secretKey', '');

    if (!this.appId || !this.secretKey) {
      this.logger.warn('DOJAH_APP_ID / DOJAH_SECRET_KEY not set — KYC checks will fail.');
    }
  }

  /** Validate BVN: confirms the BVN exists and scores the supplied names against it. */
  async validateBvn(
    bvn: string,
    firstName: string,
    lastName: string,
  ): Promise<BvnValidationResult> {
    const entity = await this.request('GET', '/api/v1/kyc/bvn', {
      query: { bvn, first_name: firstName, last_name: lastName },
    });
    // Documented shape is `bvn: { value, status }`, but the sandbox returns `bvn` as a
    // plain string. A non-empty string means a record was found; unknown BVNs return 4xx.
    const record = entity.bvn;
    return {
      valid: typeof record === 'string' ? str(record) !== null : obj(record).status === true,
      firstNameScore: num(obj(entity.first_name).confidence_value),
      lastNameScore: num(obj(entity.last_name).confidence_value),
    };
  }

  /** Lookup NIN (basic). */
  async lookupNin(nin: string): Promise<DojahPersonRecord> {
    const entity = await this.request('GET', '/api/v1/kyc/nin', { query: { nin } });
    return this.toPersonRecord(entity);
  }

  /** BVN + selfie: compares the selfie with the BVN record photo. */
  verifySelfieWithBvn(
    bvn: string,
    selfieBase64: string,
    threshold: number,
  ): Promise<SelfieVerificationResult> {
    return this.verifySelfie('/api/v1/kyc/bvn/verify', { bvn }, selfieBase64, threshold);
  }

  /** NIN + selfie: compares the selfie with the NIN record photo. */
  verifySelfieWithNin(
    nin: string,
    selfieBase64: string,
    threshold: number,
  ): Promise<SelfieVerificationResult> {
    return this.verifySelfie('/api/v1/kyc/nin/verify', { nin }, selfieBase64, threshold);
  }

  async checkLiveness(imageBase64: string): Promise<LivenessResult> {
    const entity = await this.request('POST', '/api/v1/ml/liveness', {
      body: { image: imageBase64 },
    });
    const liveness = obj(entity.liveness);
    const face = obj(entity.face);
    // Verdict and quality only: no image, and not the demographic fields in `face.details`.
    this.logger.log(
      `Dojah liveness result: ${JSON.stringify({
        entityKeys: Object.keys(entity),
        liveness,
        detected: face.detected ?? face.face_detected,
        multiface_detected: face.multiface_detected,
        message: face.message,
        quality: face.quality,
      })}`,
    );

    // The API returns `{ spoof, confidence }`; the docs show
    // `{ liveness_check, liveness_probability }`. Accept both.
    const spoofConfidence = num(liveness.confidence);
    let isLive: boolean;
    let probability: number | null;
    if (typeof liveness.spoof === 'boolean' && spoofConfidence !== null) {
      // `confidence` is certainty in the spoof verdict; convert it to "probability live".
      isLive = !liveness.spoof;
      probability = liveness.spoof ? 100 - spoofConfidence : spoofConfidence;
    } else if (typeof liveness.liveness_check === 'boolean') {
      isLive = liveness.liveness_check;
      probability = num(liveness.liveness_probability);
    } else {
      // Not the user's fault: don't report it as a failed selfie.
      throw new DojahError(502, 'Dojah liveness response had no usable result');
    }

    return {
      isLive,
      probability,
      faceDetected: (face.detected ?? face.face_detected) !== false,
      multipleFaces: face.multiface_detected === true,
    };
  }

  async analyzeDocument(
    frontBase64: string,
    documentType: DojahDocumentType,
    backBase64?: string,
  ): Promise<DocumentAnalysisResult> {
    const entity = await this.request('POST', '/api/v1/document/analysis', {
      body: {
        input_type: 'base64',
        imagefrontside: frontBase64,
        ...(backBase64 ? { imagebackside: backBase64 } : {}),
        document_type: documentType,
      },
    });

    // The docs show status fields both at the top level and nested under `status`.
    const status = { ...entity, ...obj(entity.status) };
    const overall = num(status.overall_status);
    const reason = str(status.reason);

    const fields = new Map<string, string>();
    const textData = Array.isArray(entity.text_data) ? (entity.text_data as unknown[]) : [];
    for (const item of textData) {
      const row = obj(item);
      const key = str(row.field_key)?.toLowerCase();
      const value = str(row.value);
      // status 1 = read successfully; 0 = absent; 2 = present but unreadable.
      if (key && value && num(row.status) === 1) fields.set(key, value);
    }
    const pick = (...keys: string[]) => keys.map((k) => fields.get(k)).find(Boolean) ?? null;

    return {
      valid: overall === 1 || reason === 'VALID',
      reason,
      firstName: pick('first_name', 'firstname', 'given_name', 'given_names', 'forename'),
      lastName: pick('last_name', 'lastname', 'surname', 'family_name'),
      fullName: pick('full_name', 'fullname', 'name'),
      documentNumber: pick('document_number', 'passport_number', 'license_number'),
      dateOfBirth: pick('dob', 'date_of_birth'),
      expiryDate: pick('expiry_date', 'date_of_expiry'),
    };
  }

  /** Compares a selfie with the photo on an ID document. */
  async compareFaceToDocument(
    documentBase64: string,
    selfieBase64: string,
  ): Promise<FaceCompareResult> {
    const entity = await this.request('POST', '/api/v1/kyc/photoid/verify', {
      body: { photoid_image: documentBase64, selfie_image: selfieBase64 },
    });
    const selfie = obj(entity.selfie);
    return { match: selfie.match === true, confidence: num(selfie.confidence_value) };
  }

  // --------------------------------------------------------------- helpers

  private async verifySelfie(
    path: string,
    identifier: Json,
    selfieBase64: string,
    threshold: number,
  ): Promise<SelfieVerificationResult> {
    const entity = await this.request('POST', path, {
      body: { ...identifier, selfie_image: selfieBase64, threshold },
    });
    const selfie = obj(entity.selfie_verification);
    return {
      match: selfie.match === true,
      confidence: num(selfie.confidence_value),
      record: this.toPersonRecord(entity),
    };
  }

  /** Maps BVN-style (`first_name`, `date_of_birth`) and NIN-style (`firstname`, `birthdate`) records. */
  private toPersonRecord(entity: Json): DojahPersonRecord {
    return {
      firstName: str(entity.first_name) ?? str(entity.firstname),
      middleName: str(entity.middle_name) ?? str(entity.middlename),
      lastName: str(entity.last_name) ?? str(entity.surname) ?? str(entity.lastname),
      dateOfBirth: str(entity.date_of_birth) ?? str(entity.birthdate),
    };
  }

  /** Performs the call and returns the response `entity`. Retries once on retryable statuses. */
  private async request(
    method: 'GET' | 'POST',
    path: string,
    options: { query?: Record<string, string>; body?: Json },
    attempt = 1,
  ): Promise<Json> {
    if (!this.appId || !this.secretKey) {
      throw new DojahError(0, 'Dojah credentials are not configured');
    }

    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      url.searchParams.set(key, value);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          // Dojah expects the raw secret key, not "Bearer <key>".
          Authorization: this.secretKey,
          AppId: this.appId,
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error(`Dojah ${method} ${path} failed: ${(error as Error).name}`);
      if (attempt === 1) return this.retry(method, path, options);
      throw new DojahError(0, 'Dojah request failed');
    }

    if (response.ok) {
      const payload = obj(await response.json().catch(() => ({})));
      return obj(payload.entity);
    }

    const errorBody = obj(await response.json().catch(() => ({})));
    const message = str(errorBody.error) ?? str(errorBody.message) ?? response.statusText;
    // Path only — the query string can contain the BVN/NIN.
    this.logger.warn(`Dojah ${method} ${path} -> ${response.status}`);

    if (response.status === 402) {
      this.logger.error('Dojah wallet balance is too low — all KYC checks are failing.');
    }
    if (RETRYABLE_STATUSES.has(response.status) && attempt === 1) {
      return this.retry(method, path, options);
    }
    throw new DojahError(response.status, message);
  }

  private async retry(
    method: 'GET' | 'POST',
    path: string,
    options: { query?: Record<string, string>; body?: Json },
  ): Promise<Json> {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return this.request(method, path, options, 2);
  }
}
