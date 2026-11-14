import { Prisma } from "../../generated/prisma/client.js"
import {
  addDays,
  addMonths,
  daysBetween,
  formatYm,
  formatYmd,
  lagosEndOfDayExclusive,
  lagosStartOfDay,
  lagosYmd,
  nextPayday,
  parseYmd,
} from "../../lib/dates.js"
import { badRequest } from "../../lib/errors.js"
import { koboToNumber, percentOf } from "../../lib/money.js"
import { prisma } from "../../lib/prisma.js"
import { unreadCount } from "../notifications/notifications.service.js"
import { getOnboarding } from "../onboarding/onboarding.service.js"
import { presentSalaryAccount } from "../salary-account/salary-account.presenter.js"
import { plannedAmount } from "../split-rules/rule-math.js"
import { presentIncome, tierFor } from "../users/user.presenter.js"

export async function dashboardSummary(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      salaryAccount: true,
      income: true,
      wallets: { select: { id: true, targetAmount: true } },
      splitRules: { where: { status: "active" } },
    },
  })
  const salary = user.income?.monthlyAmount ?? 0n
  const planned = user.splitRules.reduce(
    (sum, rule) => sum + plannedAmount(rule, salary),
    0n
  )
  const remaining = salary > planned ? salary - planned : 0n
  const walletsWithRule = new Set(user.splitRules.map((rule) => rule.walletId))
  const balance = user.salaryAccount?.balance ?? 0n

  const [unread, onboarding] = await Promise.all([
    unreadCount(userId),
    getOnboarding(userId),
  ])

  return {
    firstName: user.firstName,
    tier: tierFor(user),
    salaryAccount: presentSalaryAccount(user.salaryAccount, user),
    income: presentIncome(user.income),
    splitAllocation: {
      amount: koboToNumber(planned),
      activeRules: user.splitRules.length,
      percentOfSalary: percentOf(planned, salary),
    },
    wallets: {
      total: user.wallets.length,
      activeCount: user.wallets.filter((w) => walletsWithRule.has(w.id)).length,
      withTargetCount: user.wallets.filter((w) => w.targetAmount !== null).length,
    },
    nextSplitRun: {
      date: user.income ? nextPayday(user.income.paydayDay) : null,
      fundStatus: planned > 0n && balance >= planned ? "available" : "unavailable",
    },
    partition: {
      baselineSalary: koboToNumber(salary),
      toWallets: koboToNumber(planned),
      toBeneficiaries: 0,
      remaining: koboToNumber(remaining),
      remainingPercent: percentOf(remaining, salary),
    },
    unreadNotifications: unread,
    onboarding,
  }
}

type Bucket = {
  period: string
  inflow: number
  toWallets: number
  toBeneficiaries: number
  movedBack: number
}

const DEFAULT_MONTHS = 9
const MAX_RANGE_DAYS = 3 * 366
const DAILY_MAX_DAYS = 62

type Sums = { period: string; type: string; total: bigint }

/** Sums successful movements per Lagos day/month and type. */
function sumByPeriod(userId: string, granularity: "day" | "month", from: Date, to: Date) {
  const format = granularity === "day" ? "YYYY-MM-DD" : "YYYY-MM"
  return prisma.$queryRaw<Sums[]>(Prisma.sql`
    SELECT to_char(date_trunc(${granularity}, ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Lagos'), ${format}) AS period,
           "type"::text AS type,
           SUM("amount")::bigint AS total
    FROM "Transaction"
    WHERE "userId" = ${userId}::uuid
      AND "status" = 'success'
      AND "createdAt" >= ${from}
      AND "createdAt" < ${to}
    GROUP BY 1, 2`)
}

function emptyBucket(period: string): Bucket {
  return { period, inflow: 0, toWallets: 0, toBeneficiaries: 0, movedBack: 0 }
}

function addSum(bucket: Bucket, type: string, total: bigint) {
  const value = koboToNumber(total)
  if (type === "salary_credit") bucket.inflow += value
  if (type === "wallet_allocation") bucket.toWallets += value
  if (type === "wallet_withdrawal") bucket.movedBack += value
}

/**
 * Inflow and outflows per month (default: the last 9 months) or per day when
 * the requested range is 62 days or less. Empty periods are included as zeros.
 */
export async function cashFlow(
  userId: string,
  query: { from?: string | undefined; to?: string | undefined }
) {
  const today = lagosYmd(new Date())
  const to = query.to ? parseYmd(query.to) : today
  const from = query.from
    ? parseYmd(query.from)
    : { ...addMonths(to, -(DEFAULT_MONTHS - 1)), day: 1 }

  const span = daysBetween(from, to)
  if (span < 0) throw badRequest(["from: Must be on or before `to`"], "VALIDATION_ERROR")
  if (span > MAX_RANGE_DAYS)
    throw badRequest(["from: Range can be at most 3 years"], "VALIDATION_ERROR")

  const granularity = query.from && span + 1 <= DAILY_MAX_DAYS ? "day" : "month"
  const rows = await sumByPeriod(
    userId,
    granularity,
    lagosStartOfDay(from),
    lagosEndOfDayExclusive(to)
  )

  // Every period in the range, in order, so the chart has no gaps.
  const buckets: Bucket[] = []
  if (granularity === "day") {
    for (let i = 0; i <= span; i++) buckets.push(emptyBucket(formatYmd(addDays(from, i))))
  } else {
    for (let m = { year: from.year, month: from.month }; ; m = addMonths(m, 1)) {
      buckets.push(emptyBucket(formatYm(m)))
      if (m.year === to.year && m.month === to.month) break
    }
  }
  const byPeriod = new Map(buckets.map((bucket) => [bucket.period, bucket]))
  for (const row of rows) {
    const bucket = byPeriod.get(row.period)
    if (bucket) addSum(bucket, row.type, row.total)
  }

  const totals = buckets.reduce(
    (sum, b) => ({
      inflow: sum.inflow + b.inflow,
      toWallets: sum.toWallets + b.toWallets,
      toBeneficiaries: 0,
      movedBack: sum.movedBack + b.movedBack,
    }),
    { inflow: 0, toWallets: 0, toBeneficiaries: 0, movedBack: 0 }
  )

  // Salary inflow this calendar month vs last (independent of the range).
  const lastMonth = addMonths(today, -1)
  const monthRows = await sumByPeriod(
    userId,
    "month",
    lagosStartOfDay({ ...lastMonth, day: 1 }),
    lagosEndOfDayExclusive(today)
  )
  const inflowFor = (period: string) =>
    koboToNumber(
      monthRows
        .filter((r) => r.period === period && r.type === "salary_credit")
        .reduce((sum, r) => sum + r.total, 0n)
    )
  const current = inflowFor(formatYm(today))
  const previous = inflowFor(formatYm(lastMonth))

  return {
    from: formatYmd(from),
    to: formatYmd(to),
    granularity,
    buckets,
    totals,
    monthOverMonth: {
      current,
      previous,
      changePercent:
        previous === 0
          ? null
          : Math.round(((current - previous) / previous) * 10_000) / 100,
    },
  }
}
