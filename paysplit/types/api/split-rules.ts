import type { Onboarding } from "@/types/api/auth"

export type RuleDestinationType = "wallet" | "beneficiary"
export type RuleMethod = "fixed" | "percentage"
export type RuleStatus = "active" | "paused"

export type SplitRule = {
  id: string
  name: string
  /** 1–100, lower runs first */
  priority: number
  status: RuleStatus
  destinationType: RuleDestinationType
  destination: {
    type: RuleDestinationType
    id: string
    name: string
    /** "House Rent (wallet)" */
    label: string
    color: string
    /** The destination itself is paused (beneficiary), so the rule is skipped */
    paused: boolean
  }
  method: RuleMethod
  /** fixed: kobo. percentage: percent of salary (up to 2 decimals) */
  value: number
  /** "₦3.00" / "20%" */
  displayValue: string
  /** kobo planned each payday */
  plannedAmount: number
  /** kobo */
  allocatedThisMonth: number
  createdAt: string
  updatedAt: string
}

/** GET /split-rules/summary. Money in kobo. */
export type SplitRulesSummary = {
  baselineSalary: number
  totalAllocated: number
  allocatedPercent: number
  remainder: number
  remainderPercent: number
  overAllocated: boolean
  activeRules: number
  toWallets: number
  toBeneficiaries: number
  segments: {
    ruleId: string
    name: string
    destinationName: string
    destinationType: RuleDestinationType
    color: string
    amount: number
    percent: number
  }[]
}

export type CreateSplitRuleDto = {
  name: string
  priority: number
  destinationType: RuleDestinationType
  /** when destinationType = wallet */
  walletId?: string
  /** when destinationType = beneficiary */
  beneficiaryId?: string
  method: RuleMethod
  /** fixed: kobo. percentage: percent */
  value: number
  status?: RuleStatus
}

/** Send method and value together when changing the allocation. */
export type UpdateSplitRuleDto = Partial<CreateSplitRuleDto>

export type CreateSplitRuleResponse = {
  rule: SplitRule
  onboarding: Onboarding
}

export type SplitRulesParams = {
  page?: number
  limit?: number
  status?: "all" | RuleStatus
  search?: string
}
