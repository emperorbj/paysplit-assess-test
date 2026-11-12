import { describe, expect, it } from "vitest"

import {
  emptyRule,
  isRuleValid,
  ruleToFormValue,
  toRuleDto,
} from "@/components/forms/rule-fields"
import { toWalletDto } from "@/components/forms/wallet-fields"
import { RULE } from "@/test/fixtures"

describe("rule form", () => {
  it("sends fixed amounts in kobo", () => {
    const value = { ...emptyRule("wallet", "w1"), name: " Rent ", value: 30000 }
    expect(toRuleDto(value)).toEqual({
      name: "Rent",
      priority: 10,
      destinationType: "wallet",
      walletId: "w1",
      method: "fixed",
      value: 3000000,
    })
  })

  it("sends percentages as-is, to beneficiaries by beneficiaryId", () => {
    const value = {
      ...emptyRule("beneficiary", "b1"),
      name: "Mum",
      method: "percentage" as const,
      value: 20,
    }
    expect(toRuleDto(value)).toMatchObject({
      beneficiaryId: "b1",
      method: "percentage",
      value: 20,
    })
    expect(toRuleDto(value)).not.toHaveProperty("walletId")
  })

  it("round-trips an API rule through the form", () => {
    const form = ruleToFormValue(RULE)
    expect(form).toMatchObject({ targetId: RULE.destination.id, value: 3 })
    expect(toRuleDto(form).value).toBe(RULE.value)
  })

  it("rejects percentages over 100 and missing destinations", () => {
    const base = { ...emptyRule("wallet", "w1"), name: "x" }
    expect(isRuleValid({ ...base, method: "percentage", value: 120 })).toBe(
      false
    )
    expect(isRuleValid({ ...base, targetId: "", value: 5 })).toBe(false)
    expect(isRuleValid({ ...base, value: 5 })).toBe(true)
  })
})

describe("wallet form", () => {
  it("sends the target in kobo, or null for no target", () => {
    const value = {
      name: " Rent ",
      categoryId: "c1",
      target: 1500000,
      noTarget: false,
      accent: "green" as const,
    }
    expect(toWalletDto(value)).toEqual({
      name: "Rent",
      categoryId: "c1",
      accentColor: "green",
      targetAmount: 150000000,
    })
    expect(toWalletDto({ ...value, noTarget: true }).targetAmount).toBeNull()
  })
})
