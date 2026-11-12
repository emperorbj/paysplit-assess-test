import { describe, expect, it } from "vitest"

import { splitPhoneNumber } from "@/lib/phone"

const COUNTRIES = [
  { code: "NG", dialCode: "+234" },
  { code: "GH", dialCode: "+233" },
  { code: "US", dialCode: "+1" },
  { code: "JM", dialCode: "+1876" },
]

describe("splitPhoneNumber", () => {
  it("uses the country's dial code and shows local digits", () => {
    expect(splitPhoneNumber("+2348031234567", "NG", COUNTRIES)).toEqual({
      dialCode: "+234",
      phone: "08031234567",
    })
  })

  it("reads the dial code from the number when the country is unknown", () => {
    expect(splitPhoneNumber("+233201234567", null, COUNTRIES)).toEqual({
      dialCode: "+233",
      phone: "0201234567",
    })
  })

  it("prefers the longest matching dial code", () => {
    expect(splitPhoneNumber("+18761234567", null, COUNTRIES).dialCode).toBe(
      "+1876"
    )
  })

  it("falls back to +234 with no phone or countries", () => {
    expect(splitPhoneNumber(null, null, [])).toEqual({
      dialCode: "+234",
      phone: "",
    })
  })
})
