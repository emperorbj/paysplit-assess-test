import {
  Prisma,
  type RuleMethod,
  type RuleStatus,
} from "../../generated/prisma/client.js"
import { badRequest, conflict, notFound, unprocessable } from "../../lib/errors.js"
import {
  MAX_KOBO,
  formatNaira,
  koboToNumber,
  percentOf,
  percentToBps,
} from "../../lib/money.js"
import { paginate, skipTake, type PageQuery } from "../../lib/pagination.js"
import { prisma } from "../../lib/prisma.js"
import { getOnboarding } from "../onboarding/onboarding.service.js"
import { accentHex } from "../wallets/accent-colors.js"
import { allocatedThisMonth, baselineSalary } from "./rule-context.js"
import { plannedAmount } from "./rule-math.js"
import { presentRule, type RuleWithWallet } from "./split-rule.presenter.js"

const walletSelect = { select: { id: true, name: true, accentColor: true } } as const

export type RuleInput = {
  name: string
  priority: number
  destinationType: "wallet" | "beneficiary"
  walletId?: string | undefined
  beneficiaryId?: string | undefined
  method: RuleMethod
  value: number
  status?: RuleStatus | undefined
}

/** method + value → the stored columns, validating the value for its method. */
function amountColumns(method: RuleMethod, value: number) {
  if (method === "fixed") {
    if (!Number.isInteger(value) || value <= 0 || value > MAX_KOBO)
      throw unprocessable(
        "A fixed amount must be a positive whole number of kobo",
        "INVALID_RULE_VALUE"
      )
    return { fixedAmount: BigInt(value), percentBps: null }
  }
  const bps = percentToBps(value)
  if (value <= 0 || value > 100 || Math.abs(bps - value * 100) > 1e-6)
    throw unprocessable(
      "A percentage must be above 0 and at most 100, with up to 2 decimals",
      "INVALID_RULE_VALUE"
    )
  return { fixedAmount: null, percentBps: bps }
}

/** Active rules (other than `exceptId`) plus the candidate must fit in the salary. */
async function assertFitsSalary(
  userId: string,
  candidate: {
    method: RuleMethod
    fixedAmount: bigint | null
    percentBps: number | null
  } | null,
  exceptId?: string
) {
  const salary = await baselineSalary(userId)
  if (salary <= 0n)
    throw unprocessable(
      "Add your monthly salary before creating split rules",
      "INCOME_REQUIRED"
    )
  const others = await prisma.splitRule.findMany({
    where: { userId, status: "active", ...(exceptId ? { id: { not: exceptId } } : {}) },
  })
  const total = [...others, ...(candidate ? [candidate] : [])].reduce(
    (sum, rule) => sum + plannedAmount(rule, salary),
    0n
  )
  if (total > salary)
    throw unprocessable(
      `Your active rules would allocate ${formatNaira(total)}, more than your ${formatNaira(salary)} salary`,
      "ALLOCATION_EXCEEDS_SALARY",
      { totalAllocated: koboToNumber(total), baselineSalary: koboToNumber(salary) }
    )
}

async function assertWallet(userId: string, walletId: string | undefined) {
  if (!walletId)
    throw badRequest(
      ["walletId: Required when destinationType is wallet"],
      "VALIDATION_ERROR"
    )
  const wallet = await prisma.wallet.findFirst({ where: { id: walletId, userId } })
  if (!wallet) throw unprocessable("That wallet doesn't exist", "DESTINATION_NOT_FOUND")
}

function assertWalletDestination(destinationType: string | undefined) {
  if (destinationType === "beneficiary")
    throw unprocessable(
      "Beneficiary rules aren't available yet",
      "BENEFICIARIES_NOT_SUPPORTED"
    )
}

/** One rule per wallet (unique walletId) → friendly 409. */
async function withDestinationCheck<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw conflict("That wallet already has a split rule", "DESTINATION_HAS_RULE")
    throw error
  }
}

async function presentMany(userId: string, rules: RuleWithWallet[]) {
  const [salary, allocated] = await Promise.all([
    baselineSalary(userId),
    allocatedThisMonth(
      userId,
      rules.map((rule) => rule.id)
    ),
  ])
  return rules.map((rule) => presentRule(rule, salary, allocated.get(rule.id) ?? 0n))
}

async function presentOne(userId: string, rule: RuleWithWallet) {
  const [presented] = await presentMany(userId, [rule])
  return presented!
}

async function findRule(userId: string, id: string) {
  const rule = await prisma.splitRule.findFirst({
    where: { id, userId },
    include: { wallet: walletSelect },
  })
  if (!rule) throw notFound("Split rule not found", "RULE_NOT_FOUND")
  return rule
}

type ListQuery = PageQuery & {
  status?: "all" | RuleStatus | undefined
  search?: string | undefined
}

export async function listRules(userId: string, query: ListQuery) {
  const term = query.search?.trim()
  const where: Prisma.SplitRuleWhereInput = {
    userId,
    ...(query.status && query.status !== "all" ? { status: query.status } : {}),
    ...(term
      ? {
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { wallet: { name: { contains: term, mode: "insensitive" } } },
          ],
        }
      : {}),
  }
  const [rules, total] = await Promise.all([
    prisma.splitRule.findMany({
      where,
      include: { wallet: walletSelect },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      ...skipTake(query),
    }),
    prisma.splitRule.count({ where }),
  ])
  return paginate(await presentMany(userId, rules), total, query)
}

export async function getRule(userId: string, id: string) {
  return presentOne(userId, await findRule(userId, id))
}

export async function createRule(userId: string, dto: RuleInput) {
  assertWalletDestination(dto.destinationType)
  await assertWallet(userId, dto.walletId)
  const columns = amountColumns(dto.method, dto.value)
  const status = dto.status ?? "active"
  if (status === "active")
    await assertFitsSalary(userId, { method: dto.method, ...columns })
  else if ((await baselineSalary(userId)) <= 0n)
    throw unprocessable(
      "Add your monthly salary before creating split rules",
      "INCOME_REQUIRED"
    )

  const rule = await withDestinationCheck(() =>
    prisma.splitRule.create({
      data: {
        userId,
        walletId: dto.walletId!,
        name: dto.name,
        priority: dto.priority,
        status,
        method: dto.method,
        ...columns,
      },
      include: { wallet: walletSelect },
    })
  )
  return { rule: await presentOne(userId, rule), onboarding: await getOnboarding(userId) }
}

/** Edit any field, or pause/resume with `{ status }`. */
export async function updateRule(userId: string, id: string, dto: Partial<RuleInput>) {
  const existing = await findRule(userId, id)
  assertWalletDestination(dto.destinationType)
  if (
    (dto.method === undefined) !== (dto.value === undefined) &&
    dto.method !== undefined
  )
    throw badRequest(["value: Send method and value together"], "VALIDATION_ERROR")
  if (dto.walletId && dto.walletId !== existing.walletId)
    await assertWallet(userId, dto.walletId)

  const method = dto.method ?? existing.method
  const columns =
    dto.value !== undefined
      ? amountColumns(method, dto.value)
      : { fixedAmount: existing.fixedAmount, percentBps: existing.percentBps }
  const status = dto.status ?? existing.status
  if (status === "active") await assertFitsSalary(userId, { method, ...columns }, id)

  const rule = await withDestinationCheck(() =>
    prisma.splitRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.walletId !== undefined ? { walletId: dto.walletId } : {}),
        status,
        method,
        ...columns,
      },
      include: { wallet: walletSelect },
    })
  )
  return presentOne(userId, rule)
}

export async function deleteRule(userId: string, id: string) {
  const rule = await findRule(userId, id)
  await prisma.splitRule.delete({ where: { id } })
  return { message: `${rule.name} deleted.` }
}

/** The allocation bar: active rules against the monthly salary. */
export async function rulesSummary(userId: string) {
  const [salary, rules] = await Promise.all([
    baselineSalary(userId),
    prisma.splitRule.findMany({
      where: { userId, status: "active" },
      include: { wallet: walletSelect },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    }),
  ])
  const segments = rules.map((rule) => {
    const amount = plannedAmount(rule, salary)
    return {
      ruleId: rule.id,
      name: rule.name,
      destinationName: rule.wallet.name,
      destinationType: "wallet" as const,
      color: accentHex(rule.wallet.accentColor),
      amount: koboToNumber(amount),
      percent: percentOf(amount, salary),
    }
  })
  const total = rules.reduce((sum, rule) => sum + plannedAmount(rule, salary), 0n)
  const remainder = salary > total ? salary - total : 0n
  return {
    baselineSalary: koboToNumber(salary),
    totalAllocated: koboToNumber(total),
    allocatedPercent: percentOf(total, salary),
    remainder: koboToNumber(remainder),
    remainderPercent: percentOf(remainder, salary),
    overAllocated: total > salary,
    activeRules: rules.length,
    toWallets: koboToNumber(total),
    toBeneficiaries: 0,
    segments,
  }
}
