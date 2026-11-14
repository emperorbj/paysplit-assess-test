import type { Db } from "../../lib/prisma.js"
import { prisma } from "../../lib/prisma.js"

/**
 * The `onboarding` object the frontend uses for the checklist, the progress
 * ring and where to send the user after login (`nextStep`).
 */
export async function getOnboarding(userId: string, db: Db = prisma) {
  const [user, kyc, income, walletCount, ruleCount] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { kycStatus: true, phoneNumber: true, countryCode: true },
    }),
    db.kycVerification.findUnique({
      where: { userId },
      select: { identityStatus: true, livenessStatus: true },
    }),
    db.incomeProfile.findUnique({ where: { userId }, select: { id: true } }),
    db.wallet.count({ where: { userId } }),
    db.splitRule.count({ where: { userId } }),
  ])

  const profileCompleted = Boolean(user.phoneNumber && user.countryCode)
  const identityStatus = kyc?.identityStatus ?? "not_started"
  const livenessStatus = kyc?.livenessStatus ?? "not_started"
  const kycCompleted = user.kycStatus === "verified"
  const salaryDateSet = Boolean(income)
  const hasWallet = walletCount > 0
  const hasSplitRule = ruleCount > 0
  const setupCompleted = salaryDateSet && hasWallet && hasSplitRule

  // signup, profile, identity, liveness, income, wallet, rule
  const steps = [
    true,
    profileCompleted,
    identityStatus === "verified",
    livenessStatus === "verified",
    salaryDateSet,
    hasWallet,
    hasSplitRule,
  ]
  const percent = Math.round((steps.filter(Boolean).length / steps.length) * 100)

  return {
    emailVerified: true,
    passwordSet: true,
    profileCompleted,
    kycStatus: user.kycStatus,
    kyc: { identityStatus, livenessStatus },
    setupChecklist: { salaryDateSet, hasWallet, hasSplitRule, completed: setupCompleted },
    progress: {
      signupCompleted: true,
      kycCompleted,
      setupCompleted,
      percent,
    },
    nextStep: !kycCompleted ? "kyc" : !setupCompleted ? "setup" : "dashboard",
  }
}

export type Onboarding = Awaited<ReturnType<typeof getOnboarding>>
