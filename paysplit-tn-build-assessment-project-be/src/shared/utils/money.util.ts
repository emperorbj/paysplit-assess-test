/**
 * Money helpers. Every amount in PaySplit is an integer number of minor units
 * (kobo for NGN), matching HePaid. Never use floats for money.
 */

/** Smallest amount HePaid moves (₦1.00). */
export const MIN_AMOUNT_MINOR = 100;

/** Largest single amount HePaid moves (₦100,000,000.00). */
export const MAX_AMOUNT_MINOR = 10_000_000_000;

/** 100% in basis points. */
export const FULL_BPS = 10_000;

/** `amount * bps / 10000`, rounded down, without floating-point overflow. */
export function applyBps(amountMinor: number, bps: number): number {
  return Number((BigInt(Math.trunc(amountMinor)) * BigInt(Math.trunc(bps))) / BigInt(FULL_BPS));
}

/** Percent (e.g. 12.5) → basis points (1250). */
export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

/** Basis points (1250) → percent (12.5). */
export function bpsToPercent(bps: number): number {
  return bps / 100;
}

/** `part / whole` as a percentage with one decimal place; 0 when `whole` is 0. */
export function percentOf(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

/** SQL aggregates and BIGINT columns can arrive as strings. */
export function toMinor(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

const NAIRA = new Intl.NumberFormat('en-NG', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 85000000 → "850,000.00" (no currency symbol; for CSV and emails). */
export function formatMajor(amountMinor: number): string {
  return NAIRA.format(amountMinor / 100);
}

/** 85000000 → "₦850,000.00". */
export function formatNaira(amountMinor: number): string {
  return `₦${formatMajor(amountMinor)}`;
}
