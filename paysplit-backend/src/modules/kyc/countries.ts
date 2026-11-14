/** Countries we onboard. Nigeria verifies BVN/NIN; others upload an ID document. */
export type KycCountry = {
  code: string
  name: string
  dialCode: string
  currency: string
  region: "nigeria" | "international"
  methods: Array<"bvn" | "nin" | "passport" | "drivers_license">
}

const DOCUMENTS: KycCountry["methods"] = ["passport", "drivers_license"]

export const COUNTRIES: KycCountry[] = [
  {
    code: "NG",
    name: "Nigeria",
    dialCode: "+234",
    currency: "NGN",
    region: "nigeria",
    methods: ["bvn", "nin"],
  },
  {
    code: "GH",
    name: "Ghana",
    dialCode: "+233",
    currency: "GHS",
    region: "international",
    methods: DOCUMENTS,
  },
  {
    code: "KE",
    name: "Kenya",
    dialCode: "+254",
    currency: "KES",
    region: "international",
    methods: DOCUMENTS,
  },
  {
    code: "ZA",
    name: "South Africa",
    dialCode: "+27",
    currency: "ZAR",
    region: "international",
    methods: DOCUMENTS,
  },
  {
    code: "GB",
    name: "United Kingdom",
    dialCode: "+44",
    currency: "GBP",
    region: "international",
    methods: DOCUMENTS,
  },
  {
    code: "US",
    name: "United States",
    dialCode: "+1",
    currency: "USD",
    region: "international",
    methods: DOCUMENTS,
  },
  {
    code: "CA",
    name: "Canada",
    dialCode: "+1",
    currency: "CAD",
    region: "international",
    methods: DOCUMENTS,
  },
]

export const findCountry = (code: string | null | undefined) =>
  COUNTRIES.find((country) => country.code === code?.toUpperCase())

/**
 * "08031234567" + "+234" → "+2348031234567". Already-international input
 * ("+234…") is kept. Returns null if it isn't 7–12 local digits.
 */
export function toInternationalPhone(input: string, dialCode: string): string | null {
  const trimmed = input.trim()
  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "")
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null
  }
  const local = trimmed.replace(/\D/g, "").replace(/^0+/, "")
  if (local.length < 7 || local.length > 12) return null
  return `${dialCode}${local}`
}
