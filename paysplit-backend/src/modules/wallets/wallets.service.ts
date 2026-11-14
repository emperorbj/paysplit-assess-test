import { Prisma, type Category, type Wallet } from "../../generated/prisma/client.js"
import { conflict, notFound, unprocessable } from "../../lib/errors.js"
import { koboToNumber, percentOf } from "../../lib/money.js"
import { paginate, skipTake, type PageQuery } from "../../lib/pagination.js"
import { prisma } from "../../lib/prisma.js"
import { settlementReference, transactionReference } from "../../lib/references.js"
import { notify } from "../notifications/notifications.service.js"
import { allocatedThisMonth, baselineSalary } from "../split-rules/rule-context.js"
import { presentRule } from "../split-rules/split-rule.presenter.js"
import {
  presentTransaction,
  transactionInclude,
} from "../transactions/transaction.presenter.js"
import { searchFilter } from "../transactions/transactions.service.js"
import { accentHex, type AccentKey } from "./accent-colors.js"

export const MAX_WALLETS = 20

type WalletWithCategory = Wallet & { category: Category }

/** Matches the frontend `Wallet` type. */
export function presentWallet(wallet: WalletWithCategory) {
  return {
    id: wallet.id,
    name: wallet.name,
    category: {
      id: wallet.category.id,
      name: wallet.category.name,
      slug: wallet.category.slug,
    },
    accentColor: wallet.accentColor,
    accentHex: accentHex(wallet.accentColor),
    targetAmount: koboToNumber(wallet.targetAmount),
    balance: koboToNumber(wallet.balance),
    progressPercent: wallet.targetAmount
      ? Math.min(100, percentOf(wallet.balance, wallet.targetAmount))
      : 0,
    currency: wallet.currency,
    createdAt: wallet.createdAt.toISOString(),
    updatedAt: wallet.updatedAt.toISOString(),
  }
}

async function findWallet(userId: string, id: string) {
  const wallet = await prisma.wallet.findFirst({
    where: { id, userId },
    include: { category: true },
  })
  if (!wallet) throw notFound("Wallet not found", "WALLET_NOT_FOUND")
  return wallet
}

export async function listWallets(userId: string) {
  const wallets = await prisma.wallet.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { createdAt: "asc" },
  })
  return wallets.map(presentWallet)
}

export async function getWallet(userId: string, id: string) {
  const wallet = await findWallet(userId, id)
  const [sums, rule, salary] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: { walletId: id, status: "success" },
      _sum: { amount: true },
    }),
    prisma.splitRule.findUnique({
      where: { walletId: id },
      include: { wallet: { select: { id: true, name: true, accentColor: true } } },
    }),
    baselineSalary(userId),
  ])
  const total = (type: string) => sums.find((s) => s.type === type)?._sum.amount ?? 0n
  const allocated = rule ? await allocatedThisMonth(userId, [rule.id]) : new Map()

  return {
    ...presentWallet(wallet),
    stats: {
      availableBalance: koboToNumber(wallet.balance),
      totalAllocated: koboToNumber(total("wallet_allocation")),
      totalMovedBack: koboToNumber(total("wallet_withdrawal")),
    },
    linkedRule: rule ? presentRule(rule, salary, allocated.get(rule.id) ?? 0n) : null,
  }
}

type WalletInput = {
  name: string
  categoryId: string
  accentColor: AccentKey
  targetAmount?: number | null | undefined
}

async function assertCategory(categoryId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } })
  if (!category) throw unprocessable("That category doesn't exist", "CATEGORY_NOT_FOUND")
}

/** Unique (user, name) violations become a friendly 409. */
async function withNameCheck<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw conflict("You already have a wallet with that name", "WALLET_NAME_TAKEN")
    throw error
  }
}

export async function createWallet(userId: string, dto: WalletInput) {
  await assertCategory(dto.categoryId)
  if ((await prisma.wallet.count({ where: { userId } })) >= MAX_WALLETS)
    throw unprocessable(
      `You can have up to ${MAX_WALLETS} wallets`,
      "WALLET_LIMIT_REACHED"
    )

  const wallet = await withNameCheck(() =>
    prisma.wallet.create({
      data: {
        userId,
        name: dto.name,
        categoryId: dto.categoryId,
        accentColor: dto.accentColor,
        targetAmount: dto.targetAmount ? BigInt(dto.targetAmount) : null,
      },
      include: { category: true },
    })
  )
  return presentWallet(wallet)
}

export async function updateWallet(
  userId: string,
  id: string,
  dto: Partial<WalletInput>
) {
  await findWallet(userId, id)
  if (dto.categoryId) await assertCategory(dto.categoryId)
  const wallet = await withNameCheck(() =>
    prisma.wallet.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.accentColor !== undefined ? { accentColor: dto.accentColor } : {}),
        ...(dto.targetAmount !== undefined
          ? { targetAmount: dto.targetAmount ? BigInt(dto.targetAmount) : null }
          : {}),
      },
      include: { category: true },
    })
  )
  return presentWallet(wallet)
}

/** Only an empty wallet can go; its split rule goes with it. History is kept. */
export async function deleteWallet(userId: string, id: string) {
  const wallet = await findWallet(userId, id)
  if (wallet.balance > 0n)
    throw conflict(
      "Move the money back to your salary account before deleting this wallet",
      "WALLET_NOT_EMPTY"
    )
  await prisma.wallet.delete({ where: { id } })
  return { message: `${wallet.name} deleted.` }
}

/**
 * Moves money from a wallet back to the salary account. The conditional
 * decrement makes it safe against concurrent moves (no negative balances).
 */
export async function moveToSalary(userId: string, id: string, amount: number) {
  const wallet = await findWallet(userId, id)
  const kobo = BigInt(amount)

  const transaction = await prisma.$transaction(async (tx) => {
    const debited = await tx.wallet.updateMany({
      where: { id, userId, balance: { gte: kobo } },
      data: { balance: { decrement: kobo } },
    })
    if (debited.count === 0)
      throw unprocessable(
        "This wallet doesn't have enough money for that",
        "INSUFFICIENT_BALANCE"
      )

    await tx.salaryAccount.update({
      where: { userId },
      data: { balance: { increment: kobo } },
    })
    const now = new Date()
    const row = await tx.transaction.create({
      data: {
        userId,
        reference: transactionReference(now),
        type: "wallet_withdrawal",
        status: "success",
        amount: kobo,
        counterpartyName: wallet.name,
        walletId: wallet.id,
        categoryId: wallet.categoryId,
        narration: `Moved from ${wallet.name} to salary account`,
        settlementReference: settlementReference(),
        completedAt: now,
      },
      include: transactionInclude,
    })
    await notify(
      userId,
      {
        type: "wallet_moved",
        title: "Money moved to salary account",
        body: `₦${(amount / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })} moved from ${wallet.name}.`,
        data: { walletId: wallet.id, transactionId: row.id, amount },
      },
      tx
    )
    return row
  })

  const updated = await findWallet(userId, id)
  return {
    message: "Money moved to your salary account.",
    transaction: presentTransaction(transaction, "wallet"),
    wallet: presentWallet(updated),
  }
}

type ActivityQuery = PageQuery & {
  direction?: "all" | "in" | "out" | undefined
  search?: string | undefined
}

/** All wallet movements, worded from the wallets' side (in = allocated). */
export async function walletActivity(userId: string, query: ActivityQuery) {
  const types =
    query.direction === "in"
      ? (["wallet_allocation"] as const)
      : query.direction === "out"
        ? (["wallet_withdrawal"] as const)
        : (["wallet_allocation", "wallet_withdrawal"] as const)
  return walletLedger(
    { userId, type: { in: [...types] }, ...searchFilter(query.search) },
    query
  )
}

type WalletTransactionsQuery = PageQuery & {
  filter?: "all" | "allocated" | "moved" | undefined
  search?: string | undefined
}

export async function walletTransactions(
  userId: string,
  id: string,
  query: WalletTransactionsQuery
) {
  await findWallet(userId, id)
  const types =
    query.filter === "allocated"
      ? (["wallet_allocation"] as const)
      : query.filter === "moved"
        ? (["wallet_withdrawal"] as const)
        : (["wallet_allocation", "wallet_withdrawal"] as const)
  return walletLedger(
    { userId, walletId: id, type: { in: [...types] }, ...searchFilter(query.search) },
    query
  )
}

async function walletLedger(where: Prisma.TransactionWhereInput, query: PageQuery) {
  const [rows, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: transactionInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...skipTake(query),
    }),
    prisma.transaction.count({ where }),
  ])
  return paginate(
    rows.map((row) => presentTransaction(row, "wallet")),
    total,
    query
  )
}
