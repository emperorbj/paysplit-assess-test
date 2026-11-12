import type { AccentColor, WalletCategory } from "@/lib/finance"

// Mock destinations data (wallets, beneficiaries and their ledgers).
// TODO: replace these getters with API calls.

export type LinkedRule = {
  id: string
  method: "fixed" | "percentage"
  value: number
  lastModified: string
}

export type WalletRecord = {
  id: string
  name: string
  category: WalletCategory
  accent: AccentColor
  balance: number
  target: number | null
  createdAt: string
  totalAllocated: number
  totalMovedBack: number
  rule: LinkedRule | null
}

export type Beneficiary = {
  id: string
  name: string
  bank: string
  accountNumber: string
  category: WalletCategory
  narration: string
  nextSplit: string | null
  status: "active" | "paused"
  totalAllocated: number
  rule: LinkedRule | null
}

/**
 * Raw ledger movement (display text per page comes from lib/transactions.ts):
 * - `salary`: salary credited to the PaySplit account by the employer
 * - `allocation`: salary split into a wallet
 * - `moved`: wallet funds moved back to the salary account
 * - `payout`: salary split paid to a beneficiary's bank account
 */
export type LedgerEntry = {
  id: string
  reference: string
  type: "salary" | "allocation" | "moved" | "payout"
  description: string
  walletId?: string
  beneficiaryId?: string
  category: WalletCategory | "Salary"
  date: string
  status: "success" | "pending" | "failed"
  amount: number
}

const WALLETS: WalletRecord[] = [
  {
    id: "w1",
    name: "Dec Trip Fund",
    category: "Vacation",
    accent: "green",
    balance: 220000,
    target: 1500000,
    createdAt: "2026-01-23",
    totalAllocated: 2610000,
    totalMovedBack: 1000000,
    rule: {
      id: "r1",
      method: "percentage",
      value: 20,
      lastModified: "2025-11-21",
    },
  },
  {
    id: "w2",
    name: "Emergency Buffer",
    category: "Emergency",
    accent: "orange",
    balance: 1125000,
    target: 1500000,
    createdAt: "2026-01-23",
    totalAllocated: 1425000,
    totalMovedBack: 300000,
    rule: {
      id: "r2",
      method: "fixed",
      value: 47500,
      lastModified: "2025-10-02",
    },
  },
  {
    id: "w3",
    name: "Wealth Pocket",
    category: "Investment",
    accent: "purple",
    balance: 1350000,
    target: 1500000,
    createdAt: "2026-02-11",
    totalAllocated: 1350000,
    totalMovedBack: 0,
    rule: {
      id: "r3",
      method: "percentage",
      value: 10,
      lastModified: "2025-09-14",
    },
  },
  {
    id: "w4",
    name: "Rent & Housing",
    category: "Rent & Housing",
    accent: "blue",
    balance: 950000,
    target: null,
    createdAt: "2026-03-01",
    totalAllocated: 950000,
    totalMovedBack: 0,
    rule: null,
  },
]

const BENEFICIARIES: Beneficiary[] = [
  {
    id: "b1",
    name: "Funke Adebayo",
    bank: "Zenith Bank PLC",
    accountNumber: "1029384857",
    category: "Family",
    narration: "Monthly upkeep for mum — groceries and utilities.",
    nextSplit: "2026-11-25",
    status: "active",
    totalAllocated: 2610000,
    rule: {
      id: "r4",
      method: "percentage",
      value: 20,
      lastModified: "2025-11-21",
    },
  },
  {
    id: "b2",
    name: "Ali Dabbs",
    bank: "Access Bank",
    accountNumber: "1234567898",
    category: "Rent & Housing",
    narration: "Rent instalment",
    nextSplit: "2026-11-25",
    status: "active",
    totalAllocated: 1620000,
    rule: {
      id: "r5",
      method: "fixed",
      value: 135000,
      lastModified: "2025-08-03",
    },
  },
  {
    id: "b3",
    name: "Chidi Okafor",
    bank: "GTBank",
    accountNumber: "0123987465",
    category: "Education",
    narration: "School fees support",
    nextSplit: null,
    status: "paused",
    totalAllocated: 450000,
    rule: null,
  },
  {
    id: "b4",
    name: "Grace Bello",
    bank: "Kuda Bank",
    accountNumber: "2003141592",
    category: "Bills & Utilities",
    narration: "",
    nextSplit: "2026-11-28",
    status: "active",
    totalAllocated: 300000,
    rule: {
      id: "r6",
      method: "fixed",
      value: 5000,
      lastModified: "2026-02-19",
    },
  },
]

/** Tiny deterministic PRNG so mock ledgers are stable between server & client. */
function seeded(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function reference(date: Date, n: number) {
  const ymd = date.toISOString().slice(0, 10).replaceAll("-", "")
  return `PAY-${ymd}-${String(9901 - n).padStart(4, "0")}`
}

function buildLedger(): LedgerEntry[] {
  const random = seeded(42)
  const entries: LedgerEntry[] = []
  let n = 0
  // 24 months of payday splits, newest first.
  for (let month = 0; month < 24; month++) {
    const payday = new Date(Date.UTC(2026, 9 - month, 25, 12, 0))
    entries.push({
      id: `l${n}`,
      reference: reference(new Date(payday.getTime() - 3 * 3_600_000), n++),
      type: "salary",
      description: "Transfer from Talent Nation",
      category: "Salary",
      // Salary lands a few hours before the splits run.
      date: new Date(payday.getTime() - 3 * 3_600_000).toISOString(),
      status: "success",
      amount: 850000,
    })
    for (const wallet of WALLETS) {
      if (month > 18 && wallet.id !== "w1") continue
      entries.push({
        id: `l${n}`,
        reference: reference(payday, n++),
        type: "allocation",
        description: "Split from Salary",
        walletId: wallet.id,
        category: "Salary",
        date: payday.toISOString(),
        status: "success",
        amount: Math.round((50 + random() * 200) * 1000),
      })
      if (random() > 0.6) {
        const moved = new Date(payday.getTime() + 5 * 86_400_000)
        entries.push({
          id: `l${n}`,
          reference: reference(moved, n++),
          type: "moved",
          description: `${wallet.name} Wallet`,
          walletId: wallet.id,
          category: wallet.category,
          date: moved.toISOString(),
          status: random() > 0.9 ? "pending" : "success",
          amount: Math.round((20 + random() * 80) * 1000),
        })
      }
    }
    for (const beneficiary of BENEFICIARIES) {
      if (beneficiary.status === "paused" && month < 3) continue
      entries.push({
        id: `l${n}`,
        reference: reference(payday, n++),
        type: "payout",
        description: "Transfer from Talent Nation",
        beneficiaryId: beneficiary.id,
        category: "Salary",
        date: payday.toISOString(),
        status: random() > 0.95 ? "failed" : "success",
        amount: Math.round((25 + random() * 150) * 1000),
      })
    }
  }
  // Newest first.
  return entries.sort((x, y) => y.date.localeCompare(x.date))
}

const LEDGER = buildLedger()

export function getWallets() {
  return WALLETS
}

export function getWallet(id: string) {
  return WALLETS.find((wallet) => wallet.id === id) ?? null
}

export function getBeneficiaries() {
  return BENEFICIARIES
}

export function getBeneficiary(id: string) {
  return BENEFICIARIES.find((beneficiary) => beneficiary.id === id) ?? null
}

/** Ledger for all wallets, or one wallet when `walletId` is given. */
export function getWalletLedger(walletId?: string) {
  return LEDGER.filter(
    (entry) =>
      entry.walletId !== undefined && (!walletId || entry.walletId === walletId)
  )
}

/** Every movement on the account (salary, wallet splits, payouts), newest first. */
export function getLedger() {
  return LEDGER
}

export function getBeneficiaryLedger(beneficiaryId: string) {
  return LEDGER.filter((entry) => entry.beneficiaryId === beneficiaryId)
}

/** Percentage of a wallet's target reached (null when it has no target). */
export function goalProgress(wallet: Pick<WalletRecord, "balance" | "target">) {
  if (!wallet.target) return null
  return Math.min(Math.round((wallet.balance / wallet.target) * 100), 100)
}
