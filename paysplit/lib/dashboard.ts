import { koboToNaira } from "@/lib/money"
import type { CashFlowResponse, DashboardSummary } from "@/types/api/dashboard"

// Dashboard view models, built from GET /dashboard/summary and /cash-flow.
// The API sends kobo; everything here is naira for display.

export type Notification = { id: string; message: string; href: string }

export type CashFlowPoint = {
  /** ISO date of the period this point represents */
  date: string
  wallets: number
  beneficiaries: number
  /** % change vs the previous period */
  walletsChange: number
  beneficiariesChange: number
}

export type CashFlow = {
  /** This month's salary inflow */
  total: number
  /** % vs last month; null when last month had nothing to compare */
  change: number | null
  points: CashFlowPoint[]
}

export type Partition = {
  salary: number
  wallets: number
  beneficiaries: number
}

export type OnboardingChecklist = {
  signup: boolean
  kyc: boolean
  setup: boolean
}

const naira = (kobo: number) => koboToNaira(kobo) ?? 0

function percentChange(current: number, previous: number) {
  if (previous === 0) return 0
  return Math.round(((current - previous) / previous) * 1000) / 10
}

export function toCashFlow(res: CashFlowResponse): CashFlow {
  return {
    total: naira(res.monthOverMonth.current),
    change: res.monthOverMonth.changePercent,
    points: res.buckets.map((bucket, i) => {
      const prev = res.buckets[i - 1]
      return {
        // "2026-03" (month) or "2026-03-14" (day) → ISO date
        date: `${bucket.period.length === 7 ? `${bucket.period}-01` : bucket.period}T00:00:00Z`,
        wallets: naira(bucket.toWallets),
        beneficiaries: naira(bucket.toBeneficiaries),
        walletsChange: prev
          ? percentChange(bucket.toWallets, prev.toWallets)
          : 0,
        beneficiariesChange: prev
          ? percentChange(bucket.toBeneficiaries, prev.toBeneficiaries)
          : 0,
      }
    }),
  }
}

export function toPartition(summary: DashboardSummary): Partition {
  return {
    salary: naira(summary.partition.baselineSalary),
    wallets: naira(summary.partition.toWallets),
    beneficiaries: naira(summary.partition.toBeneficiaries),
  }
}
