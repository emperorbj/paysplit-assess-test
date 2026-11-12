// Mirrors the backend KYC DTOs and responses (see docs/API.md, <origin>/docs).
import type { KycState, Onboarding } from "@/types/api/auth"

export type KycRegion = "nigeria" | "international"
export type NigeriaIdMethod = "bvn" | "nin"
export type InternationalDocumentType = "passport" | "drivers_license"

export type KycCountry = {
  /** ISO 3166-1 alpha-2, e.g. "NG" */
  code: string
  name: string
  dialCode: string
  currency: string
  region: KycRegion
  methods: Array<NigeriaIdMethod | InternationalDocumentType>
}

export type KycStep = "profile" | "identity" | "liveness" | (string & {})

export type KycStatusResponse = {
  kycStatus: KycState
  /** The step to resume at */
  currentStep: KycStep
  steps: {
    profile: {
      completed: boolean
      countryCode: string | null
      phoneNumber: string | null
      currencyCode: string | null
    }
    identity: {
      status: KycState
      region: KycRegion | null
      method: NigeriaIdMethod | InternationalDocumentType | null
      maskedIdNumber: string | null
      failureReason: string | null
      attemptsRemaining: number
      retryAvailableAt: string | null
    }
    liveness: {
      status: KycState
      failureReason: string | null
      attemptsRemaining: number
      retryAvailableAt: string | null
    }
  }
  onboarding: Onboarding
}

/** Identity / liveness / profile responses carry a message and usually the new status. */
export type KycActionResponse = Partial<KycStatusResponse> & {
  message?: string
}

export type UpdateKycProfileDto = { countryCode: string; phoneNumber: string }

export type NigeriaIdentityDto = { method: NigeriaIdMethod; idNumber: string }

export type InternationalIdentityDto = {
  documentType: InternationalDocumentType
  front: File
  back?: File | null
}
