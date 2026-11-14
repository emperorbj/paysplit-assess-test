import type { SplitRunDetail } from "@/types/api/split-runs"
import type { ApiTransaction } from "@/types/api/transactions"
import type { SalaryAccount } from "@/types/api/users"

export type SimulateSalaryCreditDto = {
  /** kobo */
  amount: number
  senderName?: string
  narration?: string
  /** Split into wallets right away (default true) */
  autoSplit?: boolean
}

/** POST /simulations/salary-credit */
export type SimulateSalaryCreditResponse = {
  message: string
  /** true when the Idempotency-Key was already used (nothing new happened) */
  replayed: boolean
  transaction: ApiTransaction
  splitRun: SplitRunDetail | null
  salaryAccount: SalaryAccount
}
