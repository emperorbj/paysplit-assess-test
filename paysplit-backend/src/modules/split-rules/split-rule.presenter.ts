import type { SplitRule, Wallet } from "../../generated/prisma/client.js"
import { koboToNumber } from "../../lib/money.js"
import { accentHex } from "../wallets/accent-colors.js"
import { displayValue, plannedAmount, ruleValue } from "./rule-math.js"

export type RuleWithWallet = SplitRule & {
  wallet: Pick<Wallet, "id" | "name" | "accentColor">
}

/** Matches the frontend `SplitRule` type. */
export function presentRule(
  rule: RuleWithWallet,
  baselineSalary: bigint,
  allocatedThisMonth: bigint
) {
  return {
    id: rule.id,
    name: rule.name,
    priority: rule.priority,
    status: rule.status,
    destinationType: "wallet" as const,
    destination: {
      type: "wallet" as const,
      id: rule.wallet.id,
      name: rule.wallet.name,
      label: `${rule.wallet.name} (wallet)`,
      color: accentHex(rule.wallet.accentColor),
      paused: false,
    },
    method: rule.method,
    value: ruleValue(rule),
    displayValue: displayValue(rule),
    plannedAmount: koboToNumber(plannedAmount(rule, baselineSalary)),
    allocatedThisMonth: koboToNumber(allocatedThisMonth),
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  }
}
