import { describe, expect, it } from "vitest"

import { nextPayday, paydayLabel } from "../src/lib/dates.js"
import { applyBps, formatNaira, percentOf, percentToBps } from "../src/lib/money.js"
import { toInternationalPhone } from "../src/modules/kyc/countries.js"

describe("money", () => {
  it("formats kobo as naira", () => {
    expect(formatNaira(300n)).toBe("₦3.00")
    expect(formatNaira(85_000_000n)).toBe("₦850,000.00")
    expect(formatNaira(5n)).toBe("₦0.05")
  })

  it("computes percentages in basis points without floats", () => {
    expect(percentToBps(20.5)).toBe(2050)
    expect(applyBps(50_000_00n, 2050)).toBe(10_250_00n)
    expect(applyBps(333n, 3333)).toBe(110n) // rounds down: never allocates more than exists
    expect(percentOf(1n, 3n)).toBe(33.33)
    expect(percentOf(5n, 0n)).toBe(0)
  })
})

describe("dates (Lagos time)", () => {
  it("finds the next payday, falling back to the month's last day", () => {
    expect(nextPayday(28, new Date("2026-11-14T12:00:00Z"))).toBe("2026-11-28")
    expect(nextPayday(10, new Date("2026-11-14T12:00:00Z"))).toBe("2026-12-10")
    expect(nextPayday(31, new Date("2026-02-01T12:00:00Z"))).toBe("2026-02-28")
    // 23:30 UTC on the 27th is already the 28th in Lagos.
    expect(nextPayday(28, new Date("2026-11-27T23:30:00Z"))).toBe("2026-11-28")
  })

  it("labels paydays", () => {
    expect(paydayLabel(1)).toBe("1st of every month")
    expect(paydayLabel(22)).toBe("22nd of every month")
    expect(paydayLabel(13)).toBe("13th of every month")
    expect(paydayLabel(31)).toBe("Last day of every month")
  })
})

describe("phone numbers", () => {
  it("normalises local numbers to international format", () => {
    expect(toInternationalPhone("0803 123 4567", "+234")).toBe("+2348031234567")
    expect(toInternationalPhone("+234 803 123 4567", "+234")).toBe("+2348031234567")
    expect(toInternationalPhone("12", "+234")).toBeNull()
  })
})
