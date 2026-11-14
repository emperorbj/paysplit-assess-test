import type { Prisma, SplitTrigger } from "../../generated/prisma/client.js"
import { formatNaira, koboToNumber } from "../../lib/money.js"
import type { Tx } from "../../lib/prisma.js"
import { settlementReference, transactionReference } from "../../lib/references.js"
import { notify } from "../notifications/notifications.service.js"
import { plannedAmount } from "../split-rules/rule-math.js"

export type SkippedRule = {
  ruleId: string
  name: string
  walletName: string
  plannedAmount: number
  reason: "INSUFFICIENT_FUNDS" | "ZERO_AMOUNT"
}

/**
 * Splits the salary account into wallets by the user's active rules.
 *
 * - Rules run in priority order (lower first, then oldest).
 * - Percentages are of `baseAmount` (the credit that triggered the run, or the
 *   monthly salary for a manual run). Fixed rules move their exact amount.
 * - A rule that doesn't fit in what's left is skipped whole (no partial
 *   transfers), and the run records why.
 * - The salary account row is locked (SELECT … FOR UPDATE) for the whole run,
 *   so two runs, or a run and a wallet move, can't spend the same money.
 *
 * Must be called inside `prisma.$transaction`.
 */
export async function executeSplit(
  tx: Tx,
  userId: string,
  options: { trigger: SplitTrigger; baseAmount: bigint; creditTransactionId?: string }
) {
  const [locked] = await tx.$queryRaw<{ balance: bigint }[]>`
    SELECT "balance" FROM "SalaryAccount" WHERE "userId" = ${userId}::uuid FOR UPDATE`
  const available = locked?.balance ?? 0n

  const rules = await tx.splitRule.findMany({
    where: { userId, status: "active" },
    include: { wallet: true },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  })

  const run = await tx.splitRun.create({
    data: {
      userId,
      trigger: options.trigger,
      status: "processing",
      baseAmount: options.baseAmount,
      availableAmount: available,
      creditTransactionId: options.creditTransactionId ?? null,
    },
  })

  let remaining = available
  let moved = 0n
  const skipped: SkippedRule[] = []
  const now = new Date()

  for (const rule of rules) {
    const amount = plannedAmount(rule, options.baseAmount)
    const base = {
      ruleId: rule.id,
      name: rule.name,
      walletName: rule.wallet.name,
      plannedAmount: koboToNumber(amount),
    }
    if (amount <= 0n) {
      skipped.push({ ...base, reason: "ZERO_AMOUNT" })
      continue
    }
    if (amount > remaining) {
      skipped.push({ ...base, reason: "INSUFFICIENT_FUNDS" })
      continue
    }

    await tx.wallet.update({
      where: { id: rule.walletId },
      data: { balance: { increment: amount } },
    })
    await tx.transaction.create({
      data: {
        userId,
        reference: transactionReference(now),
        type: "wallet_allocation",
        status: "success",
        amount,
        counterpartyName: rule.wallet.name,
        walletId: rule.walletId,
        categoryId: rule.wallet.categoryId,
        splitRuleId: rule.id,
        splitRunId: run.id,
        narration: `${rule.name} (${options.trigger === "auto" ? "automatic" : "manual"} split)`,
        settlementReference: settlementReference(),
        completedAt: now,
      },
    })
    remaining -= amount
    moved += amount
  }

  if (moved > 0n) {
    await tx.salaryAccount.update({
      where: { userId },
      data: { balance: { decrement: moved } },
    })
  }

  const completed = await tx.splitRun.update({
    where: { id: run.id },
    data: {
      status: "completed",
      toWallets: moved,
      skipped: skipped as unknown as Prisma.InputJsonArray,
      completedAt: new Date(),
    },
  })

  const allocatedCount = rules.length - skipped.length
  await notify(
    userId,
    {
      type: "split_completed",
      title: allocatedCount > 0 ? "Salary split completed" : "Salary split skipped",
      body:
        allocatedCount > 0
          ? `${formatNaira(moved)} moved into ${allocatedCount} wallet${allocatedCount === 1 ? "" : "s"}.` +
            (skipped.length > 0
              ? ` ${skipped.length} rule(s) skipped: not enough funds.`
              : "")
          : "No rule could run: not enough funds in your salary account.",
      data: {
        splitRunId: run.id,
        toWallets: koboToNumber(moved),
        skipped: skipped.length,
      },
    },
    tx
  )

  return completed
}
