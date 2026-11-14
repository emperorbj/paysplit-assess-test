import type { IncomeProfile, User } from "../../generated/prisma/client.js"
import { nextPayday, paydayLabel } from "../../lib/dates.js"
import { koboToNumber } from "../../lib/money.js"
import { publicUrl } from "../../lib/storage.js"

/** Matches the frontend `User` type. */
export function presentUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    countryCode: user.countryCode,
    currencyCode: user.currencyCode,
    /** No email verification step in this build; addresses are trusted. */
    isEmailVerified: true,
    passwordSetAt: user.passwordSetAt.toISOString(),
    profileImageUrl: publicUrl(user.profileImageKey),
    kycStatus: user.kycStatus,
    isActive: user.isActive,
    role: user.role,
    roleId: user.role,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    deletedAt: user.deletedAt?.toISOString() ?? null,
    deactivatedAt: user.deactivatedAt?.toISOString() ?? null,
  }
}

export type PresentedUser = ReturnType<typeof presentUser>

/** Matches the frontend `Income` type. */
export function presentIncome(income: IncomeProfile | null) {
  if (!income) return null
  return {
    employerName: income.employerName,
    monthlyAmount: koboToNumber(income.monthlyAmount),
    currency: income.currency,
    paydayDay: income.paydayDay,
    paydayLabel: paydayLabel(income.paydayDay),
    nextPayday: nextPayday(income.paydayDay),
    updatedAt: income.updatedAt.toISOString(),
  }
}

/** Tier 1 on signup, tier 2 once KYC is verified. */
export const tierFor = (user: Pick<User, "kycStatus">) =>
  user.kycStatus === "verified" ? 2 : 1

export const fullName = (user: Pick<User, "firstName" | "lastName">) =>
  `${user.firstName} ${user.lastName}`.trim()
