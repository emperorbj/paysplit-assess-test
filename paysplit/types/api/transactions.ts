import type { Category } from "@/types/api/common"

export type TransactionType =
  | "salary_credit"
  | "wallet_allocation"
  | "wallet_withdrawal"
  | "beneficiary_payout"
  | (string & {})

export type TransactionStatus = "pending" | "success" | "failed" | "reversed"

export type TransactionDestinationType =
  "wallet" | "beneficiary" | "salary_account" | (string & {})

/**
 * A ledger row from GET /transactions, /wallets/activity and
 * /wallets/{id}/transactions. `title` and `direction` are already worded from
 * the point of view of the list it came from (salary account or wallet).
 */
export type ApiTransaction = {
  id: string
  reference: string
  type: TransactionType
  status: TransactionStatus
  title: string
  direction: "in" | "out"
  /** kobo, always positive */
  amount: number
  /** kobo; negative = money leaving the account the list is about */
  signedAmount: number
  /** kobo */
  fee: number
  currency: string
  category: Category | null
  destination: {
    type: TransactionDestinationType
    id: string | null
    name: string
  }
  narration: string | null
  createdAt: string
  completedAt: string | null
}

/** GET /transactions/{id}: the receipt. */
export type TransactionDetail = ApiTransaction & {
  recipient: {
    name: string
    type: TransactionDestinationType
    bankName: string | null
    maskedAccountNumber: string | null
  } | null
  settlementReference: string | null
  providerReference: string | null
  splitRuleId: string | null
}

export type TransactionFilterType = "all" | "wallet" | "beneficiary" | "salary"

export type TransactionsParams = {
  page?: number
  limit?: number
  type?: TransactionFilterType
  direction?: "all" | "in" | "out"
  status?: TransactionStatus
  search?: string
  /** YYYY-MM-DD, Lagos time, inclusive */
  from?: string
  to?: string
}

export type TransactionsExportParams = Omit<
  TransactionsParams,
  "page" | "limit"
>
