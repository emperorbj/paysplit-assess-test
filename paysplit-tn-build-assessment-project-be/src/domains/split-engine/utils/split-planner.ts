import type {
  SplitRuleDestinationType,
  SplitRuleMethod,
} from '../../split-rules/entities/split-rule.entity';
import { MIN_AMOUNT_MINOR, applyBps } from '../../../shared/utils/money.util';
import type { SkippedRule } from '../entities/split-run.entity';

export interface PlannableRule {
  id: string;
  name: string;
  priority: number;
  destinationType: SplitRuleDestinationType;
  method: SplitRuleMethod;
  fixedAmount: number | null;
  percentageBps: number | null;
  /** False when the wallet/beneficiary was deleted. */
  destinationExists: boolean;
  /** False when the beneficiary is paused. */
  destinationActive: boolean;
}

export interface PlannedSplit<R extends PlannableRule> {
  rule: R;
  /** Kobo moved to the destination. */
  amount: number;
  /** Kobo held for the HePaid transfer fee (beneficiaries only). */
  fee: number;
}

export interface SplitPlan<R extends PlannableRule> {
  items: PlannedSplit<R>[];
  skipped: SkippedRule[];
  /** Salary account balance left after the plan, kobo. */
  remaining: number;
}

export interface PlanInput<R extends PlannableRule> {
  /** Active rules (any order; sorted here by priority, lowest first). */
  rules: R[];
  /** What percentage rules apply to: the salary credit, or the balance for Run Now. */
  baseAmount: number;
  /** Salary account balance available to split. */
  available: number;
  /** Fee reserve per beneficiary payout. */
  payoutFee: number;
}

/**
 * Works out what each rule moves, in priority order (lower number first).
 *
 * Fixed rules move their amount; percentage rules move a share of
 * `baseAmount`. A rule that doesn't fit in what's left is skipped and the
 * next one is tried, so a large higher-priority rule never blocks a small one.
 * Beneficiary payouts also need room for the fee reserve.
 */
export function planSplit<R extends PlannableRule>(input: PlanInput<R>): SplitPlan<R> {
  const rules = [...input.rules].sort((a, b) => a.priority - b.priority);
  const items: PlannedSplit<R>[] = [];
  const skipped: SkippedRule[] = [];
  let remaining = Math.max(0, input.available);

  for (const rule of rules) {
    const amount =
      rule.method === 'fixed'
        ? (rule.fixedAmount ?? 0)
        : applyBps(input.baseAmount, rule.percentageBps ?? 0);
    const skip = (reason: SkippedRule['reason']) =>
      skipped.push({ ruleId: rule.id, ruleName: rule.name, amount, reason });

    if (!rule.destinationExists) {
      skip('destination_missing');
      continue;
    }
    if (!rule.destinationActive) {
      skip('destination_paused');
      continue;
    }
    if (amount < MIN_AMOUNT_MINOR) {
      skip('below_minimum');
      continue;
    }
    const fee = rule.destinationType === 'beneficiary' ? Math.max(0, input.payoutFee) : 0;
    if (amount + fee > remaining) {
      skip('insufficient_funds');
      continue;
    }
    items.push({ rule, amount, fee });
    remaining -= amount + fee;
  }

  return { items, skipped, remaining };
}
