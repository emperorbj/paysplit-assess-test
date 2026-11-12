import type { SalaryAccount } from "@/types/api/users"

export const ADD_BVN_OR_NIN = "add_bvn_or_nin"

export type FundingAccount = {
  bankName: string
  accountNumber: string
  accountName: string
}

/** GET /salary-account. Account numbers are null until the status is active. */
export type SalaryAccountDetails = SalaryAccount & {
  accounts?: FundingAccount[]
  actionRequired: typeof ADD_BVN_OR_NIN | null
}

export type AddSalaryIdentityDto = {
  method: "bvn" | "nin"
  /** 11 digits */
  idNumber: string
}
