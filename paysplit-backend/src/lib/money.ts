/**
 * Money is integer kobo everywhere (₦1 = 100 kobo). The database stores BigInt;
 * JSON responses use plain numbers, which are exact up to 2^53 kobo (~₦90 trillion).
 */

/** Largest amount the API accepts in a request: ₦100bn, far below 2^53. */
export const MAX_KOBO = 10_000_000_000_000

export function koboToNumber(value: bigint): number
export function koboToNumber(value: bigint | null | undefined): number | null
export function koboToNumber(value: bigint | null | undefined): number | null {
  return value === null || value === undefined ? null : Number(value)
}

/** amount × basis points / 10 000, rounded down to whole kobo. */
export function applyBps(amount: bigint, bps: number): bigint {
  return (amount * BigInt(bps)) / 10_000n
}

/** Percent (2 decimals) → basis points: 20.5 → 2050. */
export function percentToBps(percent: number): number {
  return Math.round(percent * 100)
}

export function bpsToPercent(bps: number): number {
  return bps / 100
}

/** part / whole as a percentage with 2 decimals; 0 when whole is 0. */
export function percentOf(part: bigint, whole: bigint): number {
  if (whole <= 0n) return 0
  return Number((part * 10_000n) / whole) / 100
}

const nairaFormat = new Intl.NumberFormat("en-NG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 300 → "₦3.00" */
export function formatNaira(kobo: bigint): string {
  const negative = kobo < 0n
  const abs = negative ? -kobo : kobo
  const naira = Number(abs / 100n) + Number(abs % 100n) / 100
  return `${negative ? "-" : ""}₦${nairaFormat.format(naira)}`
}

export function minBig(a: bigint, b: bigint): bigint {
  return a < b ? a : b
}
