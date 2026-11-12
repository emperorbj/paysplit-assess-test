// Mirrors the backend auth DTOs and responses (see docs/API.md, <origin>/docs).

export type KycState =
  | "not_started"
  | "in_progress"
  | "pending"
  | "passed"
  | "verified"
  | "approved"
  | "failed"
  | "rejected"
  | "action_required"
  | (string & {})

export type User = {
  id: string
  email: string
  firstName: string
  lastName: string
  phoneNumber: string | null
  countryCode: string | null
  currencyCode: string | null
  isEmailVerified: boolean
  passwordSetAt: string | null
  profileImageUrl?: string | null
  kycStatus: KycState
  isActive: boolean
  role: string
  roleId: string
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  deactivatedAt: string | null
}

export type Onboarding = {
  emailVerified: boolean
  passwordSet: boolean
  profileCompleted: boolean
  kycStatus: KycState
  kyc: { identityStatus: KycState; livenessStatus: KycState }
  setupChecklist: {
    salaryDateSet: boolean
    hasWallet: boolean
    hasBeneficiary?: boolean
    hasSplitRule: boolean
    completed?: boolean
  }
  /** Drives the "Complete your account setup" ring */
  progress?: {
    signupCompleted: boolean
    kycCompleted: boolean
    setupCompleted: boolean
    percent: number
  }
  nextStep: "kyc" | "setup" | "dashboard" | (string & {})
}

export type MessageResponse = { message: string }

/* ---------------------------------- Signup --------------------------------- */

export type SignupDto = { firstName: string; lastName: string; email: string }

export type CodeSentResponse = MessageResponse & {
  email: string
  /** Drives the "Resend in 0:45" countdown */
  resendAvailableInSeconds: number
}

export type VerifyCodeDto = { email: string; code: string }

export type VerifyEmailResponse = MessageResponse & {
  /** Short-lived token for POST /auth/password/set; never persist it */
  setupToken: string
  setupTokenExpiresIn: number
  user: User
}

export type SetPasswordDto = { password: string; confirmPassword: string }

/* ---------------------------------- Login ---------------------------------- */

export type LoginDto = { email: string; password: string; rememberMe?: boolean }

export type AuthResponse = {
  accessToken: string
  tokenType: "Bearer"
  /** seconds */
  expiresIn: number
  user: User
  onboarding: Onboarding
}

export type MeResponse = { user: User; onboarding: Onboarding }

/* ----------------------------- Forgot password ----------------------------- */

export type ResetPasswordDto = { email: string; newPassword: string }

/** Backend error code: login before signup was finished (a new code is emailed). */
export const ACCOUNT_SETUP_INCOMPLETE = "ACCOUNT_SETUP_INCOMPLETE"

export type ChangePasswordDto = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

/** The other sessions are signed out; this token replaces the current one. */
export type ChangePasswordResponse = Pick<
  AuthResponse,
  "accessToken" | "expiresIn"
> & { message?: string }
