import { lagosStartOfDay, lagosYmd } from "../../lib/dates.js"
import { prisma, type Db } from "../../lib/prisma.js"

/** Monthly salary in kobo (0 until the income source is set). */
export async function baselineSalary(userId: string, db: Db = prisma): Promise<bigint> {
  const income = await db.incomeProfile.findUnique({
    where: { userId },
    select: { monthlyAmount: true },
  })
  return income?.monthlyAmount ?? 0n
}

export function startOfLagosMonth(now = new Date()): Date {
  const { year, month } = lagosYmd(now)
  return lagosStartOfDay({ year, month, day: 1 })
}

/** Kobo each rule has moved since the 1st of this month (Lagos). */
export async function allocatedThisMonth(
  userId: string,
  ruleIds: string[],
  db: Db = prisma
) {
  if (ruleIds.length === 0) return new Map<string, bigint>()
  const groups = await db.transaction.groupBy({
    by: ["splitRuleId"],
    where: {
      userId,
      type: "wallet_allocation",
      status: "success",
      splitRuleId: { in: ruleIds },
      createdAt: { gte: startOfLagosMonth() },
    },
    _sum: { amount: true },
  })
  return new Map(groups.map((g) => [g.splitRuleId!, g._sum.amount ?? 0n]))
}
