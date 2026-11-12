import type { Category } from "@/types/api/common"

export type SplitRun = {
  id: string
  trigger: "auto" | "manual" | (string & {})
  status: "completed" | "processing" | (string & {})
  /** All amounts are kobo. */
  baseAmount: number
  availableAmount: number
  toWallets: number
  toBeneficiaries: number
  fees: number
  /** Rules that didn't fit; the item shape isn't documented yet. */
  skipped: unknown[]
  creditTransactionId: string | null
  createdAt: string
  completedAt: string | null
}

export type SplitRunTransaction = {
  id: string
  reference: string
  status: string
  title: string
  amount: number
  category: Category | null
  createdAt: string
}

export type SplitRunDetail = SplitRun & { transactions: SplitRunTransaction[] }

export type SplitRunsParams = { page?: number; limit?: number }
