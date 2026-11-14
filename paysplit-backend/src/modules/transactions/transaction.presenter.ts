import type { Category, Prisma, Transaction } from "../../generated/prisma/client.js"
import { koboToNumber } from "../../lib/money.js"

export type TransactionRow = Transaction & { category: Category | null }

export const transactionInclude = { category: true } satisfies Prisma.TransactionInclude

/** Which list a row is shown in decides its wording and sign. */
export type LedgerView = "salary" | "wallet"

const SALARY_ACCOUNT = {
  type: "salary_account",
  id: null,
  name: "Salary account",
} as const

function describe(row: TransactionRow, view: LedgerView) {
  const wallet = { type: "wallet", id: row.walletId, name: row.counterpartyName }
  switch (row.type) {
    case "salary_credit":
      return {
        title: `Transfer from ${row.counterpartyName}`,
        direction: "in" as const,
        destination: SALARY_ACCOUNT,
      }
    case "wallet_allocation":
      return view === "salary"
        ? {
            title: `Split to ${row.counterpartyName}`,
            direction: "out" as const,
            destination: wallet,
          }
        : {
            title: "Allocated from salary",
            direction: "in" as const,
            destination: wallet,
          }
    case "wallet_withdrawal":
      return view === "salary"
        ? {
            title: `Moved from ${row.counterpartyName}`,
            direction: "in" as const,
            destination: SALARY_ACCOUNT,
          }
        : {
            title: "Moved to salary account",
            direction: "out" as const,
            destination: SALARY_ACCOUNT,
          }
  }
}

/** Matches the frontend `ApiTransaction` type. */
export function presentTransaction(row: TransactionRow, view: LedgerView) {
  const { title, direction, destination } = describe(row, view)
  const amount = koboToNumber(row.amount)
  return {
    id: row.id,
    reference: row.reference,
    type: row.type,
    status: row.status,
    title,
    direction,
    amount,
    signedAmount: direction === "in" ? amount : -amount,
    fee: koboToNumber(row.fee),
    currency: row.currency,
    category: row.category
      ? { id: row.category.id, name: row.category.name, slug: row.category.slug }
      : null,
    destination: { ...destination },
    narration: row.narration,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  }
}

export type PresentedTransaction = ReturnType<typeof presentTransaction>
