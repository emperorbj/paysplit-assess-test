import type { Onboarding } from "@/types/api/auth"
import type { Income } from "@/types/api/users"

export type UpsertIncomeDto = {
  employerName: string
  /** kobo */
  monthlyAmount: number
  /** 1–31 (31 = last day of short months) */
  paydayDay: number
}

export type IncomeResponse = { income: Income | null }
export type UpsertIncomeResponse = { income: Income; onboarding: Onboarding }
export type SetupProgressResponse = { onboarding: Onboarding }
