import type { Category, SplitRun, Transaction } from "../../generated/prisma/client.js"
import { notFound, unprocessable } from "../../lib/errors.js"
import { koboToNumber } from "../../lib/money.js"
import { paginate, skipTake, type PageQuery } from "../../lib/pagination.js"
import { prisma } from "../../lib/prisma.js"
import { baselineSalary } from "../split-rules/rule-context.js"
import { executeSplit } from "./split-engine.js"

/** Matches the frontend `SplitRun` type. */
export function presentRun(run: SplitRun) {
  return {
    id: run.id,
    trigger: run.trigger,
    status: run.status,
    baseAmount: koboToNumber(run.baseAmount),
    availableAmount: koboToNumber(run.availableAmount),
    toWallets: koboToNumber(run.toWallets),
    toBeneficiaries: 0,
    fees: koboToNumber(run.fees),
    skipped: run.skipped as unknown[],
    creditTransactionId: run.creditTransactionId,
    createdAt: run.createdAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
  }
}

type RunWithTransactions = SplitRun & {
  transactions: (Transaction & { category: Category | null })[]
}

export function presentRunDetail(run: RunWithTransactions) {
  return {
    ...presentRun(run),
    transactions: run.transactions.map((tx) => ({
      id: tx.id,
      reference: tx.reference,
      status: tx.status,
      title: `Split to ${tx.counterpartyName}`,
      amount: koboToNumber(tx.amount),
      category: tx.category
        ? { id: tx.category.id, name: tx.category.name, slug: tx.category.slug }
        : null,
      createdAt: tx.createdAt.toISOString(),
    })),
  }
}

const detailInclude = {
  transactions: { include: { category: true }, orderBy: { createdAt: "asc" } },
} as const

export async function listRuns(userId: string, query: PageQuery) {
  const [runs, total] = await Promise.all([
    prisma.splitRun.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      ...skipTake(query),
    }),
    prisma.splitRun.count({ where: { userId } }),
  ])
  return paginate(runs.map(presentRun), total, query)
}

export async function getRun(userId: string, id: string) {
  const run = await prisma.splitRun.findFirst({
    where: { id, userId },
    include: detailInclude,
  })
  if (!run) throw notFound("Split run not found", "SPLIT_RUN_NOT_FOUND")
  return presentRunDetail(run)
}

/** "Run split now": percentages are of the monthly salary. */
export async function runManualSplit(userId: string) {
  const [account, salary, activeRules] = await Promise.all([
    prisma.salaryAccount.findUnique({ where: { userId } }),
    baselineSalary(userId),
    prisma.splitRule.count({ where: { userId, status: "active" } }),
  ])
  if (account?.status !== "active")
    throw unprocessable(
      "Complete KYC to get your salary account first",
      "SALARY_ACCOUNT_INACTIVE"
    )
  if (salary <= 0n)
    throw unprocessable("Add your monthly salary first", "INCOME_REQUIRED")
  if (activeRules === 0)
    throw unprocessable("You have no active split rules", "NO_ACTIVE_RULES")
  if (account.balance <= 0n)
    throw unprocessable("Your salary account has no money to split", "NO_FUNDS")

  const run = await prisma.$transaction((tx) =>
    executeSplit(tx, userId, { trigger: "manual", baseAmount: salary })
  )
  return getRun(userId, run.id)
}
