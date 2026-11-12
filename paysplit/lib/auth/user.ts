import type { KycState, Onboarding, User } from "@/types/api/auth"

const DONE_STATES: KycState[] = [
  "approved",
  "verified",
  "passed",
  "completed",
  "success",
]

/** True once a KYC step (or overall KYC) has succeeded. */
export function isKycDone(state: KycState | null | undefined) {
  return !!state && DONE_STATES.includes(state)
}

export function fullName(user: Pick<User, "firstName" | "lastName">) {
  return `${user.firstName} ${user.lastName}`.trim()
}

export function initials(user: Pick<User, "firstName" | "lastName">) {
  return `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase()
}

/** Tier 2 unlocks after KYC approval (per the onboarding copy). */
export function tierFor(user: Pick<User, "kycStatus">) {
  return isKycDone(user.kycStatus) ? 2 : 1
}

/** Dashboard checklist state derived from the backend onboarding object. */
export function onboardingChecklist(onboarding: Onboarding) {
  const { setupChecklist } = onboarding
  return {
    signup: onboarding.emailVerified && onboarding.passwordSet,
    kyc: isKycDone(onboarding.kycStatus),
    setup:
      setupChecklist.completed ??
      (setupChecklist.salaryDateSet &&
        setupChecklist.hasWallet &&
        setupChecklist.hasSplitRule),
  }
}
