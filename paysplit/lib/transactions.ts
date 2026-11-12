import { getBeneficiary, getWallet, type LedgerEntry } from "@/lib/destinations"

/**
 * A ledger movement as shown in a table. The same raw entry reads differently
 * depending on whose point of view the page takes, e.g. a wallet split is
 * money *out* of the salary account but money *into* the wallet.
 */
export type Transaction = {
  id: string
  reference: string
  description: string
  category: string
  date: string
  status: "success" | "pending" | "failed" | "reversed"
  amount: number
  /** `in` = green credit, `wallet` = blue debit to a wallet, `payout` = red debit to a person */
  tone: "in" | "wallet" | "payout"
  /** For the All / Wallet / Beneficiary filters. */
  kind: "salary" | "wallet" | "beneficiary"
  counterparty: string
  counterpartyType: "Wallet" | "Beneficiary" | "Employer" | "Salary account"
}

export type Perspective = "account" | "wallet" | "beneficiary"

const EMPLOYER = "Talent Nation"

export function toTransaction(
  entry: LedgerEntry,
  perspective: Perspective
): Transaction {
  const base = {
    id: entry.id,
    reference: entry.reference,
    date: entry.date,
    status: entry.status,
    amount: entry.amount,
  }
  const wallet = entry.walletId ? getWallet(entry.walletId) : null
  const beneficiary = entry.beneficiaryId
    ? getBeneficiary(entry.beneficiaryId)
    : null
  const walletName = wallet?.name ?? "Wallet"
  const beneficiaryName = beneficiary?.name ?? "Beneficiary"

  switch (entry.type) {
    case "salary":
      return {
        ...base,
        description: `Transfer from ${EMPLOYER}`,
        category: "Salary",
        tone: "in",
        kind: "salary",
        counterparty: EMPLOYER,
        counterpartyType: "Employer",
      }
    case "allocation":
      return perspective === "wallet"
        ? {
            ...base,
            description: "Split from Salary",
            category: "Salary",
            tone: "in",
            kind: "wallet",
            counterparty: "Salary account",
            counterpartyType: "Salary account",
          }
        : {
            ...base,
            description: `${walletName} Wallet`,
            category: wallet?.category ?? "Savings",
            tone: "wallet",
            kind: "wallet",
            counterparty: walletName,
            counterpartyType: "Wallet",
          }
    case "moved":
      return perspective === "wallet"
        ? {
            ...base,
            description: `${walletName} Wallet`,
            category: wallet?.category ?? "Savings",
            tone: "wallet",
            kind: "wallet",
            counterparty: "Salary account",
            counterpartyType: "Salary account",
          }
        : {
            ...base,
            description: `Moved from ${walletName}`,
            category: wallet?.category ?? "Savings",
            tone: "in",
            kind: "wallet",
            counterparty: walletName,
            counterpartyType: "Wallet",
          }
    case "payout":
      return perspective === "beneficiary"
        ? {
            ...base,
            description: `Transfer from ${EMPLOYER}`,
            category: "Salary",
            tone: "payout",
            kind: "beneficiary",
            counterparty: beneficiaryName,
            counterpartyType: "Beneficiary",
          }
        : {
            ...base,
            description: `Transfer to ${beneficiaryName}`,
            category: beneficiary?.category ?? "Other",
            tone: "payout",
            kind: "beneficiary",
            counterparty: beneficiaryName,
            counterpartyType: "Beneficiary",
          }
  }
}

export function toTransactions(
  entries: LedgerEntry[],
  perspective: Perspective
) {
  return entries.map((entry) => toTransaction(entry, perspective))
}

/** "Oct 25, 2026 | 12:00PM" (table) */
export function formatTableDate(iso: string) {
  const date = new Date(iso)
  const day = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
  return `${day} | ${formatTime(date).replace(" ", "")}`
}

/** "Oct 25, 2026 at 09:00 AM" (details) */
export function formatTimestamp(iso: string) {
  const date = new Date(iso)
  const day = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
  return `${day} at ${formatTime(date)}`
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })
}

/** CSV rows (with header) for a statement export. */
export function transactionsToCsvRows(transactions: Transaction[]) {
  return [
    [
      "Reference",
      "Description",
      "Type",
      "Category",
      "Date",
      "Status",
      "Amount (NGN)",
    ],
    ...transactions.map((t) => [
      t.reference,
      t.description,
      t.counterpartyType,
      t.category,
      t.date,
      t.status,
      t.tone === "in" ? t.amount : -t.amount,
    ]),
  ]
}
