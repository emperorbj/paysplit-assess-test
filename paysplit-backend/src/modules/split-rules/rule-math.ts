import type { SplitRule } from "../../generated/prisma/client.js"
import { applyBps, bpsToPercent, formatNaira } from "../../lib/money.js"

type RuleAmount = Pick<SplitRule, "method" | "fixedAmount" | "percentBps">

/** Kobo this rule moves when `base` is split (fixed ignores the base). */
export function plannedAmount(rule: RuleAmount, base: bigint): bigint {
  if (rule.method === "fixed") return rule.fixedAmount ?? 0n
  return applyBps(base, rule.percentBps ?? 0)
}

/** API value: kobo for fixed, percent (2 dp) for percentage. */
export function ruleValue(rule: RuleAmount): number {
  return rule.method === "fixed"
    ? Number(rule.fixedAmount ?? 0n)
    : bpsToPercent(rule.percentBps ?? 0)
}

export function displayValue(rule: RuleAmount): string {
  return rule.method === "fixed"
    ? formatNaira(rule.fixedAmount ?? 0n)
    : `${bpsToPercent(rule.percentBps ?? 0)}%`
}
