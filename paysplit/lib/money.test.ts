import { describe, expect, it } from "vitest"

import { koboToNaira, nairaToKobo } from "@/lib/money"

describe("money", () => {
  it("converts kobo to naira", () => {
    expect(koboToNaira(85000000)).toBe(850000)
    expect(koboToNaira(5000)).toBe(50)
    expect(koboToNaira(0)).toBe(0)
  })

  it("converts naira to whole kobo", () => {
    expect(nairaToKobo(850000)).toBe(85000000)
    // Float noise must not produce fractional kobo.
    expect(nairaToKobo(19.99)).toBe(1999)
    expect(nairaToKobo(0.1 + 0.2)).toBe(30)
  })

  it("passes null and undefined through", () => {
    expect(koboToNaira(null)).toBeNull()
    expect(nairaToKobo(undefined)).toBeNull()
  })
})
