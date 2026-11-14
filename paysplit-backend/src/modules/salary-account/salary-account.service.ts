import { conflict, serviceUnavailable, unprocessable } from "../../lib/errors.js"
import { prisma, type Tx } from "../../lib/prisma.js"
import { accountNumber, maskIdNumber } from "../../lib/references.js"
import {
  KycProviderError,
  kycProvider,
  type BankIdMethod,
} from "../../integrations/kyc/index.js"
import { notify } from "../notifications/notifications.service.js"
import { presentSalaryAccountDetails } from "./salary-account.presenter.js"

/** Simulated partner bank that "holds" every salary account. */
export const SALARY_BANK_NAME = "PaySplit MFB (Sandbox)"

/**
 * Activates the user's salary account with a fresh account number. Needs a
 * verified Nigerian BVN/NIN and verified KYC; idempotent once active.
 */
export async function issueSalaryAccount(tx: Tx, userId: string) {
  const account = await tx.salaryAccount.findUniqueOrThrow({ where: { userId } })
  if (account.status === "active") return account

  // Account numbers are random; retry the rare collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const number = accountNumber()
    const taken = await tx.salaryAccount.findUnique({ where: { accountNumber: number } })
    if (taken) continue
    const issued = await tx.salaryAccount.update({
      where: { userId },
      data: {
        status: "active",
        accountNumber: number,
        bankName: SALARY_BANK_NAME,
        issuedAt: new Date(),
      },
    })
    await notify(
      userId,
      {
        type: "salary_account_issued",
        title: "Your salary account is ready",
        body: `Ask your employer to pay your salary into ${SALARY_BANK_NAME}, account ${number}.`,
        data: { accountNumber: number },
      },
      tx
    )
    return issued
  }
  throw new Error("Could not allocate a unique account number")
}

export async function getSalaryAccountDetails(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { salaryAccount: true, kyc: true },
  })
  return presentSalaryAccountDetails(user.salaryAccount, user, user.kyc)
}

/**
 * For users who passed KYC with a foreign ID document: a Nigerian bank account
 * still needs a BVN or NIN, so they add one here to get their account issued.
 */
export async function addSalaryIdentity(
  userId: string,
  dto: { method: BankIdMethod; idNumber: string }
) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { kyc: true },
  })
  if (user.kycStatus !== "verified")
    throw conflict("Complete KYC before adding a BVN or NIN", "KYC_REQUIRED")
  if (user.kyc?.bankIdentityVerified)
    throw conflict("Your BVN/NIN is already verified", "IDENTITY_ALREADY_VERIFIED")

  let result
  try {
    result = await kycProvider.lookupBankIdentity(dto.method, dto.idNumber)
  } catch (error) {
    if (error instanceof KycProviderError)
      throw serviceUnavailable(
        "Verification is unavailable right now. Please try again shortly.",
        "KYC_PROVIDER_UNAVAILABLE"
      )
    throw error
  }
  if (!result.found) throw unprocessable(result.reason, "IDENTITY_NOT_FOUND")

  await prisma.$transaction(async (tx) => {
    await tx.kycVerification.update({
      where: { userId },
      data: {
        bankIdentityVerified: true,
        // Keep the document as the KYC identity; just record the BVN/NIN mask.
        maskedIdNumber: user.kyc?.maskedIdNumber ?? maskIdNumber(dto.idNumber),
      },
    })
    await issueSalaryAccount(tx, userId)
  })
  return getSalaryAccountDetails(userId)
}
