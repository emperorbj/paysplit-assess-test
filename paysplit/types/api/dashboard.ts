import type { Onboarding } from "@/types/api/auth"
import type { Income, SalaryAccount } from "@/types/api/users"

/** GET /dashboard/summary. Money in kobo. */
export type DashboardSummary = {
  firstName: string
  tier: number
  salaryAccount: SalaryAccount
  income: Income | null
  splitAllocation: {
    amount: number
    activeRules: number
    percentOfSalary: number
  }
  wallets: { total: number; activeCount: number; withTargetCount: number }
  nextSplitRun: {
    /** YYYY-MM-DD, null without a payday */
    date: string | null
    fundStatus: "available" | "unavailable"
  }
  partition: {
    baselineSalary: number
    toWallets: number
    toBeneficiaries: number
    remaining: number
    remainingPercent: number
  }
  unreadNotifications: number
  onboarding: Onboarding
}

export type CashFlowBucket = {
  /** "2026-03" (month) or "2026-03-14" (day) */
  period: string
  inflow: number
  toWallets: number
  toBeneficiaries: number
  movedBack: number
}

/** GET /dashboard/cash-flow. Money in kobo. */
export type CashFlowResponse = {
  from: string
  to: string
  granularity: "month" | "day"
  buckets: CashFlowBucket[]
  totals: Omit<CashFlowBucket, "period">
  monthOverMonth: {
    current: number
    previous: number
    /** null when last month was 0 */
    changePercent: number | null
  }
}

export type CashFlowParams = {
  /** YYYY-MM-DD (Lagos) */
  from?: string
  to?: string
}
