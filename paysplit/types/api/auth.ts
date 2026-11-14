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

/** One step: names, email and password. Returns an `AuthResponse` (signed in). */
export type SignupDto = {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  rememberMe?: boolean
}

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

/* ----------------------------- Change password ----------------------------- */

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
