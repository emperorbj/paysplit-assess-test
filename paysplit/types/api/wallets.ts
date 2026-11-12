import type { Category } from "@/types/api/common"
import type { SplitRule } from "@/types/api/split-rules"
import type { ApiTransaction } from "@/types/api/transactions"

export type WalletAccent =
  "green" | "orange" | "purple" | "blue" | "red" | "yellow" | "teal" | "pink"

export type AccentColorOption = { key: WalletAccent; hex: string }

export type Wallet = {
  id: string
  name: string
  category: Category
  accentColor: WalletAccent
  accentHex: string
  /** kobo; null = "No targeted amount" */
  targetAmount: number | null
  /** kobo */
  balance: number
  progressPercent: number
  currency: string
  createdAt: string
  updatedAt: string
}

export type WalletDetail = Wallet & {
  stats: {
    /** kobo */
    availableBalance: number
    totalAllocated: number
    totalMovedBack: number
  }
  linkedRule: SplitRule | null
}

export type CreateWalletDto = {
  name: string
  categoryId: string
  accentColor: WalletAccent
  /** kobo; omit/null for no target */
  targetAmount?: number | null
}

export type UpdateWalletDto = Partial<CreateWalletDto>

/** Row from GET /wallets/activity and /wallets/{id}/transactions. */
export type WalletTransactionRow = ApiTransaction

export type WalletActivityParams = {
  page?: number
  limit?: number
  direction?: "all" | "in" | "out"
  search?: string
}

export type WalletTransactionsParams = {
  page?: number
  limit?: number
  filter?: "all" | "allocated" | "moved"
  search?: string
}

export type MoveWalletFundsDto = {
  /** kobo */
  amount: number
}

export type MoveWalletFundsResponse = {
  message: string
  transaction: ApiTransaction
  wallet: Wallet
}
