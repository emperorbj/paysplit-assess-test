import type { ApiTransaction } from "@/types/api/transactions"
import type { SplitRule } from "@/types/api/split-rules"

// Real responses from the dev API (Nov 2026), trimmed.

const SAVINGS = {
  id: "748e79a9-dddf-4f0d-9a5f-2883f6a25083",
  name: "Savings",
  slug: "savings",
}

/** GET /transactions: salary account point of view */
export const SALARY_CREDIT: ApiTransaction = {
  id: "b2a35383-19dd-4434-8dc7-46586c48d49c",
  reference: "PAY-20261106-01A3E0",
  type: "salary_credit",
  status: "success",
  title: "Transfer from Test Employer Ltd",
  direction: "in",
  amount: 50000000,
  signedAmount: 50000000,
  fee: 0,
  currency: "NGN",
  category: null,
  destination: { type: "salary_account", id: null, name: "Salary Account" },
  narration: "Manual test salary credit",
  createdAt: "2026-11-06T18:02:34.964Z",
  completedAt: "2026-11-06T18:02:34.964Z",
}

export const ALLOCATION_OUT: ApiTransaction = {
  id: "fa1379f9-8fff-4739-bc01-e454de913935",
  reference: "PAY-20261106-75C676",
  type: "wallet_allocation",
  status: "success",
  title: "House Rent Wallet",
  direction: "out",
  amount: 10000000,
  signedAmount: -10000000,
  fee: 0,
  currency: "NGN",
  category: SAVINGS,
  destination: {
    type: "wallet",
    id: "55d5b7e5-4aff-4fb1-989b-98615b45a0d7",
    name: "House Rent",
  },
  narration: "Manual split to House Rent",
  createdAt: "2026-11-06T18:06:41.165Z",
  completedAt: "2026-11-06T18:06:41.165Z",
}

export const WITHDRAWAL_IN: ApiTransaction = {
  ...ALLOCATION_OUT,
  id: "cb6be931-98b2-463a-a7f2-eda5791b0e39",
  reference: "PAY-20261106-3DSU44",
  type: "wallet_withdrawal",
  title: "Moved from House Rent",
  direction: "in",
  amount: 5000,
  signedAmount: 5000,
  destination: { type: "salary_account", id: null, name: "Salary Account" },
}

/** GET /wallets/activity: the same allocation from the wallet's point of view */
export const ALLOCATION_INTO_WALLET: ApiTransaction = {
  ...ALLOCATION_OUT,
  title: "Split from Salary",
  direction: "in",
  signedAmount: 10000000,
}

export const RULE: SplitRule = {
  id: "217dbe7b-dfcc-40c7-8bf1-12d0a4115720",
  name: "Payment for gbese",
  priority: 10,
  status: "active",
  destinationType: "wallet",
  destination: {
    type: "wallet",
    id: "55d5b7e5-4aff-4fb1-989b-98615b45a0d7",
    name: "House Rent",
    label: "House Rent (wallet)",
    color: "#22A447",
    paused: false,
  },
  method: "fixed",
  value: 300,
  displayValue: "₦3.00",
  plannedAmount: 300,
  allocatedThisMonth: 0,
  createdAt: "2026-11-06T18:17:35.876Z",
  updatedAt: "2026-11-06T18:17:35.876Z",
}
