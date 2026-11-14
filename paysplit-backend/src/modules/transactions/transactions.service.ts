import type { Prisma, TransactionType } from "../../generated/prisma/client.js"
import {
  lagosDateString,
  lagosEndOfDayExclusive,
  lagosStartOfDay,
  parseYmd,
} from "../../lib/dates.js"
import { notFound } from "../../lib/errors.js"
import { koboToNumber } from "../../lib/money.js"
import { paginate, skipTake, type PageQuery } from "../../lib/pagination.js"
import { prisma } from "../../lib/prisma.js"
import { maskAccountNumber } from "../../lib/references.js"
import { fullName } from "../users/user.presenter.js"
import { presentTransaction, transactionInclude } from "./transaction.presenter.js"

export type TransactionFilters = {
  type?: "all" | "wallet" | "beneficiary" | "salary" | undefined
  direction?: "all" | "in" | "out" | undefined
  status?: "pending" | "success" | "failed" | "reversed" | undefined
  search?: string | undefined
  from?: string | undefined
  to?: string | undefined
}

/** In the salary-account view, money in = credits and moves back from wallets. */
const IN_TYPES: TransactionType[] = ["salary_credit", "wallet_withdrawal"]
const OUT_TYPES: TransactionType[] = ["wallet_allocation"]
const WALLET_TYPES: TransactionType[] = ["wallet_allocation", "wallet_withdrawal"]

function typesFor(filters: TransactionFilters): TransactionType[] | null {
  let types: TransactionType[] = ["salary_credit", ...WALLET_TYPES]
  if (filters.type === "wallet") types = WALLET_TYPES
  if (filters.type === "salary") types = ["salary_credit"]
  // Beneficiary payouts aren't part of this build: nothing matches.
  if (filters.type === "beneficiary") types = []
  if (filters.direction === "in") types = types.filter((t) => IN_TYPES.includes(t))
  if (filters.direction === "out") types = types.filter((t) => OUT_TYPES.includes(t))
  return types
}

export function searchFilter(search: string | undefined): Prisma.TransactionWhereInput {
  const term = search?.trim()
  if (!term) return {}
  return {
    OR: [
      { reference: { contains: term, mode: "insensitive" } },
      { counterpartyName: { contains: term, mode: "insensitive" } },
      { narration: { contains: term, mode: "insensitive" } },
    ],
  }
}

/** YYYY-MM-DD bounds in Lagos time, inclusive of the `to` day. */
export function dateFilter(from?: string, to?: string): Prisma.TransactionWhereInput {
  if (!from && !to) return {}
  return {
    createdAt: {
      ...(from ? { gte: lagosStartOfDay(parseYmd(from)) } : {}),
      ...(to ? { lt: lagosEndOfDayExclusive(parseYmd(to)) } : {}),
    },
  }
}

function buildWhere(
  userId: string,
  filters: TransactionFilters
): Prisma.TransactionWhereInput {
  return {
    userId,
    type: { in: typesFor(filters) ?? [] },
    ...(filters.status ? { status: filters.status } : {}),
    ...dateFilter(filters.from, filters.to),
    ...searchFilter(filters.search),
  }
}

/** The salary account's ledger (GET /transactions), newest first. */
export async function listTransactions(
  userId: string,
  query: PageQuery & TransactionFilters
) {
  const where = buildWhere(userId, query)
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
    rows.map((row) => presentTransaction(row, "salary")),
    total,
    query
  )
}

/** The receipt: the row plus recipient and references. */
export async function getTransaction(userId: string, id: string) {
  const row = await prisma.transaction.findFirst({
    where: { id, userId },
    include: { ...transactionInclude, user: { include: { salaryAccount: true } } },
  })
  if (!row) throw notFound("Transaction not found", "TRANSACTION_NOT_FOUND")

  const account = row.user.salaryAccount
  const toWallet = row.type === "wallet_allocation"
  return {
    ...presentTransaction(row, "salary"),
    recipient: toWallet
      ? {
          name: row.counterpartyName,
          type: "wallet",
          bankName: null,
          maskedAccountNumber: null,
        }
      : {
          name: fullName(row.user),
          type: "salary_account",
          bankName: account?.bankName ?? null,
          maskedAccountNumber: account?.accountNumber
            ? maskAccountNumber(account.accountNumber)
            : null,
        },
    settlementReference: row.settlementReference,
    providerReference: row.providerReference,
    splitRuleId: row.splitRuleId,
  }
}

export const EXPORT_LIMIT = 5000

/** Spreadsheet apps run cells starting with = + - @ as formulas; neutralise them. */
function csvCell(value: string | number | null): string {
  let text = value === null ? "" : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** CSV statement for the same filters as the list (newest first, max 5,000 rows). */
export async function exportTransactionsCsv(userId: string, filters: TransactionFilters) {
  const rows = await prisma.transaction.findMany({
    where: buildWhere(userId, filters),
    include: transactionInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: EXPORT_LIMIT,
  })
  const header = [
    "Date",
    "Reference",
    "Description",
    "Type",
    "Direction",
    "Amount (NGN)",
    "Fee (NGN)",
    "Status",
    "Category",
    "Narration",
  ]
  const lines = rows.map((row) => {
    const tx = presentTransaction(row, "salary")
    return [
      row.createdAt.toISOString(),
      tx.reference,
      tx.title,
      tx.type,
      tx.direction,
      (koboToNumber(row.amount) / 100).toFixed(2),
      (koboToNumber(row.fee) / 100).toFixed(2),
      tx.status,
      tx.category?.name ?? "",
      tx.narration,
    ]
      .map(csvCell)
      .join(",")
  })
  return {
    filename: `paysplit-statement-${lagosDateString(new Date())}.csv`,
    // BOM so Excel opens the ₦/UTF-8 text correctly.
    content: `\uFEFF${[header.join(","), ...lines].join("\r\n")}\r\n`,
  }
}
