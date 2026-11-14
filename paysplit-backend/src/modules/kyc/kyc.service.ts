import type { KycVerification } from "../../generated/prisma/client.js"
import {
  badRequest,
  conflict,
  serviceUnavailable,
  tooManyRequests,
  unprocessable,
} from "../../lib/errors.js"
import { prisma } from "../../lib/prisma.js"
import { maskIdNumber } from "../../lib/references.js"
import { env } from "../../config/env.js"
import {
  KycProviderError,
  kycProvider,
  type BankIdMethod,
  type DocumentType,
} from "../../integrations/kyc/index.js"
import { notify } from "../notifications/notifications.service.js"
import { getOnboarding } from "../onboarding/onboarding.service.js"
import { issueSalaryAccount } from "../salary-account/salary-account.service.js"
import { findCountry, toInternationalPhone } from "./countries.js"

export const MAX_ATTEMPTS = 3
export const LOCK_MS = 60 * 60 * 1000 // 1 hour after the last allowed attempt

type Step = "identity" | "liveness"

/** Attempts left in the current window; an expired lock starts a new window. */
function attemptState(attempts: number, lockedUntil: Date | null, now = new Date()) {
  if (lockedUntil && lockedUntil > now)
    return { remaining: 0, retryAvailableAt: lockedUntil, attempts }
  if (lockedUntil) return { remaining: MAX_ATTEMPTS, retryAvailableAt: null, attempts: 0 }
  return {
    remaining: Math.max(0, MAX_ATTEMPTS - attempts),
    retryAvailableAt: null,
    attempts,
  }
}

function stepState(kyc: KycVerification, step: Step) {
  return step === "identity"
    ? attemptState(kyc.identityAttempts, kyc.identityLockedUntil)
    : attemptState(kyc.livenessAttempts, kyc.livenessLockedUntil)
}

export async function getKycStatus(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { kyc: true },
  })
  const kyc = user.kyc ?? (await prisma.kycVerification.create({ data: { userId } }))
  const profileCompleted = Boolean(user.countryCode && user.phoneNumber)
  const identity = stepState(kyc, "identity")
  const liveness = stepState(kyc, "liveness")

  const currentStep = !profileCompleted
    ? "profile"
    : kyc.identityStatus !== "verified"
      ? "identity"
      : "liveness"

  return {
    kycStatus: user.kycStatus,
    currentStep,
    steps: {
      profile: {
        completed: profileCompleted,
        countryCode: user.countryCode,
        phoneNumber: user.phoneNumber,
        currencyCode: user.currencyCode,
      },
      identity: {
        status: kyc.identityStatus,
        region: kyc.identityRegion,
        method: kyc.identityMethod,
        maskedIdNumber: kyc.maskedIdNumber,
        failureReason: kyc.identityFailureReason,
        attemptsRemaining: identity.remaining,
        retryAvailableAt: identity.retryAvailableAt?.toISOString() ?? null,
      },
      liveness: {
        status: kyc.livenessStatus,
        failureReason: kyc.livenessFailureReason,
        attemptsRemaining: liveness.remaining,
        retryAvailableAt: liveness.retryAvailableAt?.toISOString() ?? null,
      },
    },
    onboarding: await getOnboarding(userId),
  }
}

async function withStatus(userId: string, message: string) {
  return { message, ...(await getKycStatus(userId)) }
}

export async function updateKycProfile(
  userId: string,
  dto: { countryCode: string; phoneNumber: string }
) {
  const country = findCountry(dto.countryCode)
  if (!country)
    throw badRequest(
      ["countryCode: We don't support that country yet"],
      "VALIDATION_ERROR"
    )
  const phoneNumber = toInternationalPhone(dto.phoneNumber, country.dialCode)
  if (!phoneNumber)
    throw badRequest(["phoneNumber: Enter a valid phone number"], "VALIDATION_ERROR")

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { kyc: true },
  })
  const identityDone = user.kyc?.identityStatus === "verified"
  if (identityDone && user.countryCode !== country.code)
    throw conflict(
      "Your country can't change after identity verification",
      "COUNTRY_LOCKED"
    )

  await prisma.user.update({
    where: { id: userId },
    data: {
      countryCode: country.code,
      currencyCode: country.currency,
      phoneNumber,
      ...(user.kycStatus === "not_started" ? { kycStatus: "in_progress" } : {}),
    },
  })
  return withStatus(userId, "Profile saved.")
}

/** Loads KYC state and enforces step order, lockouts and "already done". */
async function beginAttempt(userId: string, step: Step) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { kyc: true },
  })
  const kyc = user.kyc ?? (await prisma.kycVerification.create({ data: { userId } }))

  if (!user.countryCode || !user.phoneNumber)
    throw conflict("Complete your profile basics first", "PROFILE_REQUIRED")
  if (step === "liveness" && kyc.identityStatus !== "verified")
    throw conflict("Verify your identity before the selfie check", "IDENTITY_REQUIRED")

  const status = step === "identity" ? kyc.identityStatus : kyc.livenessStatus
  if (status === "verified")
    throw conflict(
      step === "identity"
        ? "Your identity is already verified"
        : "Your selfie is already verified",
      step === "identity" ? "IDENTITY_ALREADY_VERIFIED" : "LIVENESS_ALREADY_VERIFIED"
    )

  const state = stepState(kyc, step)
  if (state.remaining <= 0)
    throw tooManyRequests(
      "Too many failed attempts. Please try again later.",
      "KYC_ATTEMPTS_EXCEEDED",
      { retryAvailableAt: state.retryAvailableAt?.toISOString() ?? null }
    )
  return { user, kyc, attempts: state.attempts }
}

/** Saves a failed attempt (and a lock after the last one), then throws 422. */
async function recordFailure(
  userId: string,
  step: Step,
  attemptsSoFar: number,
  reason: string,
  code: string
): Promise<never> {
  const attempts = attemptsSoFar + 1
  const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MS) : null
  await prisma.kycVerification.update({
    where: { userId },
    data:
      step === "identity"
        ? {
            identityStatus: "failed",
            identityFailureReason: reason,
            identityAttempts: attempts,
            identityLockedUntil: lockedUntil,
          }
        : {
            livenessStatus: "failed",
            livenessFailureReason: reason,
            livenessAttempts: attempts,
            livenessLockedUntil: lockedUntil,
          },
  })
  const remaining = Math.max(0, MAX_ATTEMPTS - attempts)
  throw unprocessable(reason, code, {
    attemptsRemaining: remaining,
    retryAvailableAt: lockedUntil?.toISOString() ?? null,
  })
}

/** Provider outages become 503 and don't use up an attempt. */
async function callProvider<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call()
  } catch (error) {
    if (error instanceof KycProviderError)
      throw serviceUnavailable(
        "Verification is unavailable right now. Please try again shortly.",
        "KYC_PROVIDER_UNAVAILABLE"
      )
    throw error
  }
}

const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "")

/** Both account names appear in the record (in any order). */
function namesMatch(
  account: { firstName: string; lastName: string },
  record: { firstName: string; lastName: string }
) {
  const recordNames = [record.firstName, record.lastName].map(normalizeName)
  return [account.firstName, account.lastName]
    .map(normalizeName)
    .every((name) => recordNames.includes(name))
}

export async function verifyNigeriaIdentity(
  userId: string,
  dto: { method: BankIdMethod; idNumber: string }
) {
  const { user, attempts } = await beginAttempt(userId, "identity")
  if (findCountry(user.countryCode)?.region !== "nigeria")
    throw conflict("BVN/NIN verification is for Nigerian profiles", "WRONG_REGION")

  const result = await callProvider(() =>
    kycProvider.lookupBankIdentity(dto.method, dto.idNumber)
  )
  if (!result.found)
    return recordFailure(
      userId,
      "identity",
      attempts,
      result.reason,
      "IDENTITY_NOT_FOUND"
    )
  if (env.KYC_ENFORCE_NAME_MATCH && !namesMatch(user, result))
    return recordFailure(
      userId,
      "identity",
      attempts,
      `The ${dto.method.toUpperCase()} record's name doesn't match your account name`,
      "NAME_MISMATCH"
    )

  await prisma.kycVerification.update({
    where: { userId },
    data: {
      identityStatus: "verified",
      identityRegion: "nigeria",
      identityMethod: dto.method,
      maskedIdNumber: maskIdNumber(dto.idNumber),
      identityFailureReason: null,
      identityAttempts: 0,
      identityLockedUntil: null,
      identityReference: result.reference,
      identityVerifiedAt: new Date(),
      bankIdentityVerified: true,
    },
  })
  return withStatus(userId, `${dto.method.toUpperCase()} verified.`)
}

export async function verifyInternationalIdentity(
  userId: string,
  input: { documentType: DocumentType; front: Buffer; back?: Buffer | undefined }
) {
  const { user, attempts } = await beginAttempt(userId, "identity")
  const country = findCountry(user.countryCode)
  if (country?.region !== "international")
    throw conflict("Nigerian profiles verify with a BVN or NIN", "WRONG_REGION")
  if (!country.methods.includes(input.documentType))
    throw badRequest(["documentType: Not accepted for your country"], "VALIDATION_ERROR")

  const result = await callProvider(() => kycProvider.checkDocument(input))
  if (!result.valid)
    return recordFailure(userId, "identity", attempts, result.reason, "DOCUMENT_INVALID")

  await prisma.kycVerification.update({
    where: { userId },
    data: {
      identityStatus: "verified",
      identityRegion: "international",
      identityMethod: input.documentType,
      maskedIdNumber: null,
      identityFailureReason: null,
      identityAttempts: 0,
      identityLockedUntil: null,
      identityReference: result.reference,
      identityVerifiedAt: new Date(),
    },
  })
  return withStatus(userId, "Document accepted.")
}

/**
 * Final KYC step. On success KYC is verified (tier 2) and, if a BVN/NIN was
 * verified, the salary account is issued in the same transaction.
 */
export async function submitLiveness(userId: string, selfie: Buffer) {
  const { kyc, attempts } = await beginAttempt(userId, "liveness")

  const result = await callProvider(() => kycProvider.checkLiveness(selfie))
  if (!result.passed)
    return recordFailure(userId, "liveness", attempts, result.reason, result.code)

  await prisma.$transaction(async (tx) => {
    await tx.kycVerification.update({
      where: { userId },
      data: {
        livenessStatus: "verified",
        livenessFailureReason: null,
        livenessAttempts: 0,
        livenessLockedUntil: null,
        livenessReference: result.reference,
        livenessVerifiedAt: new Date(),
      },
    })
    await tx.user.update({ where: { id: userId }, data: { kycStatus: "verified" } })
    await notify(
      userId,
      {
        type: "kyc_verified",
        title: "Identity verified",
        body: kyc.bankIdentityVerified
          ? "You're now tier 2 and your salary account is ready."
          : "You're now tier 2. Add a BVN or NIN to get your salary account.",
      },
      tx
    )
    if (kyc.bankIdentityVerified) await issueSalaryAccount(tx, userId)
  })
  return withStatus(userId, "Identity approved.")
}
