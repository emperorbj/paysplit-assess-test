import { describe, expect, it } from "vitest"

import { mapTransaction } from "@/hooks/transactions/map-transaction"
import {
  ALLOCATION_INTO_WALLET,
  ALLOCATION_OUT,
  SALARY_CREDIT,
  WITHDRAWAL_IN,
} from "@/test/fixtures"

describe("mapTransaction", () => {
  it("shows a salary credit as money in from the employer", () => {
    expect(mapTransaction(SALARY_CREDIT)).toMatchObject({
      description: "Transfer from Test Employer Ltd",
      amount: 500000,
      tone: "in",
      kind: "salary",
      category: "Salary",
      counterparty: "Test Employer Ltd",
      counterpartyType: "Employer",
    })
  })

  it("shows a split to a wallet as money out (blue) from the salary account", () => {
    expect(mapTransaction(ALLOCATION_OUT)).toMatchObject({
      amount: 100000,
      tone: "wallet",
      kind: "wallet",
      category: "Savings",
      counterparty: "House Rent",
      counterpartyType: "Wallet",
    })
  })

  it("shows a move back to salary as money in from the wallet", () => {
    expect(mapTransaction(WITHDRAWAL_IN)).toMatchObject({
      amount: 50,
      tone: "in",
      counterparty: "House Rent",
      counterpartyType: "Wallet",
    })
  })

  it("shows the same split as money in when listed for the wallet", () => {
    expect(mapTransaction(ALLOCATION_INTO_WALLET)).toMatchObject({
      description: "Split from Salary",
      tone: "in",
      counterparty: "Salary account",
    })
  })

  it("marks payouts to a beneficiary red", () => {
    const payout = {
      ...ALLOCATION_OUT,
      type: "beneficiary_payout",
      destination: { type: "beneficiary", id: "b1", name: "Funke" },
    }
    expect(mapTransaction(payout)).toMatchObject({
      tone: "payout",
      kind: "beneficiary",
      counterpartyType: "Beneficiary",
    })
  })
})
