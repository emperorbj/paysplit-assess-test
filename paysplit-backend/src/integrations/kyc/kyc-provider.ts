/** What PaySplit needs from a KYC provider. Implemented by Dojah and a mock. */

export type BankIdMethod = "bvn" | "nin"
export type DocumentType = "passport" | "drivers_license"

export type IdentityLookupResult =
  | { found: true; firstName: string; lastName: string; reference: string | null }
  | { found: false; reason: string }

export type DocumentCheckResult =
  | { valid: true; reference: string | null; documentName: string | null }
  | { valid: false; reason: string }

export type LivenessFailureCode =
  "NO_FACE_DETECTED" | "MULTIPLE_FACES" | "LIVENESS_FAILED"

export type LivenessResult =
  | { passed: true; probability: number | null; reference: string | null }
  | { passed: false; code: LivenessFailureCode; reason: string }

export type KycProvider = {
  name: string
  lookupBankIdentity(
    method: BankIdMethod,
    idNumber: string
  ): Promise<IdentityLookupResult>
  checkDocument(input: {
    documentType: DocumentType
    front: Buffer
    back?: Buffer | undefined
  }): Promise<DocumentCheckResult>
  checkLiveness(selfie: Buffer): Promise<LivenessResult>
}

/** The provider is down, misconfigured or timed out. Mapped to 503; no attempt is used up. */
export class KycProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message)
    this.name = "KycProviderError"
  }
}
