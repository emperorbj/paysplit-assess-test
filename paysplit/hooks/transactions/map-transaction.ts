import { koboToNaira } from "@/lib/money"
import type { Transaction } from "@/lib/transactions"
import type { ApiTransaction } from "@/types/api/transactions"

const COUNTERPARTY_TYPE: Record<string, Transaction["counterpartyType"]> = {
  wallet: "Wallet",
  beneficiary: "Beneficiary",
  salary_account: "Salary account",
}

/** Where incoming money came from, for "Received From" on the receipt. */
function sourceOf(row: ApiTransaction): {
  name: string
  type: Transaction["counterpartyType"]
} {
  if (row.type === "salary_credit") {
    return {
      name: row.title.replace(/^Transfer from\s+/i, "") || "Employer",
      type: "Employer",
    }
  }
  if (row.type === "wallet_withdrawal") {
    return {
      name: row.title.replace(/^Moved from\s+/i, "") || "Wallet",
      type: "Wallet",
    }
  }
  // e.g. a wallet allocation seen from the wallet: it came from salary.
  return { name: "Salary account", type: "Salary account" }
}

/**
 * API ledger row → table row. The API already words `title` and signs
 * `signedAmount` from the list's point of view (salary account or wallet),
 * so the colour follows the sign: green in, blue to a wallet, red to a person.
 */
export function mapTransaction(row: ApiTransaction): Transaction {
  const isIn = row.signedAmount >= 0
  const destinationType = row.destination?.type
  const kind: Transaction["kind"] =
    row.type === "salary_credit"
      ? "salary"
      : destinationType === "beneficiary" || row.type.includes("beneficiary")
        ? "beneficiary"
        : "wallet"
  const source = isIn ? sourceOf(row) : null

  return {
    id: row.id,
    reference: row.reference,
    description: row.title,
    category:
      row.category?.name ?? (row.type === "salary_credit" ? "Salary" : "—"),
    date: row.completedAt ?? row.createdAt,
    status: row.status,
    amount: koboToNaira(Math.abs(row.amount)) ?? 0,
    tone: isIn ? "in" : destinationType === "beneficiary" ? "payout" : "wallet",
    kind,
    counterparty: source?.name ?? row.destination?.name ?? "—",
    counterpartyType:
      source?.type ?? COUNTERPARTY_TYPE[destinationType] ?? "Wallet",
  }
}
