import type {
  KycVerification,
  SalaryAccount,
  User,
} from "../../generated/prisma/client.js"
import { koboToNumber } from "../../lib/money.js"
import { maskAccountNumber } from "../../lib/references.js"
import { fullName } from "../users/user.presenter.js"

export const ADD_BVN_OR_NIN = "add_bvn_or_nin"

/** Matches the frontend `SalaryAccount` type. */
export function presentSalaryAccount(
  account: SalaryAccount | null,
  user: Pick<User, "firstName" | "lastName">
) {
  const active = account?.status === "active" && account.accountNumber
  return {
    status: account?.status ?? "not_issued",
    balance: koboToNumber(account?.balance ?? 0n),
    currency: account?.currency ?? "NGN",
    accountName: fullName(user),
    accountNumber: active ? account.accountNumber : null,
    maskedAccountNumber: active ? maskAccountNumber(account.accountNumber!) : null,
    bankName: active ? account.bankName : null,
  }
}

/** GET /salary-account: adds the funding accounts and any action needed. */
export function presentSalaryAccountDetails(
  account: SalaryAccount | null,
  user: Pick<User, "firstName" | "lastName" | "kycStatus">,
  kyc: Pick<KycVerification, "bankIdentityVerified"> | null
) {
  const base = presentSalaryAccount(account, user)
  const needsBankIdentity = user.kycStatus === "verified" && !kyc?.bankIdentityVerified
  return {
    ...base,
    accounts:
      base.accountNumber && base.bankName
        ? [
            {
              bankName: base.bankName,
              accountNumber: base.accountNumber,
              accountName: base.accountName,
            },
          ]
        : [],
    actionRequired: needsBankIdentity ? ADD_BVN_OR_NIN : null,
  }
}
