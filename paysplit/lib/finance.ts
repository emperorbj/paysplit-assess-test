// Shared money/wallet catalogues and helpers.
// TODO: source categories and banks from the backend once the API exists.

export const WALLET_CATEGORIES = [
  "Emergency",
  "Vacation",
  "Savings",
  "Rent & Housing",
  "Education",
  "Bills & Utilities",
  "Investment",
  "Family",
  "Other",
] as const

export type WalletCategory = (typeof WALLET_CATEGORIES)[number]

/** `hex` is the solid swatch / icon tile, `tint` the soft card background. */
export const ACCENT_COLORS = [
  { id: "green", label: "Green", hex: "#12A633", tint: "#EAFFED" },
  { id: "blue", label: "Blue", hex: "#33A7F5", tint: "#EAF6FF" },
  { id: "purple", label: "Purple", hex: "#8B3DFF", tint: "#F0E5FF" },
  { id: "orange", label: "Orange", hex: "#F4511E", tint: "#FFEDE8" },
  { id: "red", label: "Red", hex: "#F04438", tint: "#FFEDE8" },
  { id: "black", label: "Black", hex: "#121212", tint: "#F5F5F5" },
] as const

export type AccentColor = (typeof ACCENT_COLORS)[number]["id"]

export function getAccent(id: AccentColor) {
  return ACCENT_COLORS.find((color) => color.id === id) ?? ACCENT_COLORS[0]
}

export const NIGERIAN_BANKS = [
  "Access Bank",
  "Fidelity Bank",
  "First Bank of Nigeria",
  "FCMB",
  "GTBank",
  "Kuda Bank",
  "Moniepoint",
  "OPay",
  "Stanbic IBTC",
  "Sterling Bank",
  "UBA",
  "Union Bank",
  "Wema Bank",
  "Zenith Bank",
] as const

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
})

const nairaFormatterWithKobo = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
})

/** 850000 → "₦850,000"; with `{ kobo: true }` → "₦850,000.00" */
export function formatNaira(amount: number, options?: { kobo?: boolean }) {
  return (options?.kobo ? nairaFormatterWithKobo : nairaFormatter).format(
    amount
  )
}

/** 28 → "28th" */
export function ordinal(n: number) {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`
}

/**
 * Mock account-name lookup.
 * TODO: replace with the real name-enquiry endpoint.
 */
export async function resolveAccountName(
  bank: string,
  accountNumber: string
): Promise<string | null> {
  await new Promise((resolve) => setTimeout(resolve, 700))
  if (!bank || !/^\d{10}$/.test(accountNumber)) return null
  return "Ali Dabbs"
}
