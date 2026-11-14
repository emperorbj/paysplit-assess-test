/**
 * PaySplit runs on Lagos time (WAT, UTC+1, no daylight saving), so date
 * filters, paydays and monthly buckets use a fixed +1h offset.
 */
const LAGOS_OFFSET_MS = 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

type Ymd = { year: number; month: number; day: number }

/** The calendar date in Lagos for an instant. */
export function lagosYmd(date: Date): Ymd {
  const shifted = new Date(date.getTime() + LAGOS_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  }
}

const pad = (n: number) => String(n).padStart(2, "0")

export function formatYmd({ year, month, day }: Ymd): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

export function formatYm({ year, month }: Pick<Ymd, "year" | "month">): string {
  return `${year}-${pad(month)}`
}

export function lagosDateString(date: Date): string {
  return formatYmd(lagosYmd(date))
}

export function parseYmd(value: string): Ymd {
  const [year, month, day] = value.split("-").map(Number) as [number, number, number]
  return { year, month, day }
}

/** 00:00 Lagos time on that date, as an instant. */
export function lagosStartOfDay(ymd: Ymd): Date {
  return new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day) - LAGOS_OFFSET_MS)
}

/** 00:00 Lagos time on the day after, i.e. an exclusive end bound. */
export function lagosEndOfDayExclusive(ymd: Ymd): Date {
  return new Date(lagosStartOfDay(ymd).getTime() + DAY_MS)
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function addMonths({ year, month }: Pick<Ymd, "year" | "month">, delta: number) {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

export function addDays(ymd: Ymd, delta: number): Ymd {
  return lagosYmd(new Date(lagosStartOfDay(ymd).getTime() + delta * DAY_MS))
}

export function daysBetween(from: Ymd, to: Ymd): number {
  return Math.round(
    (lagosStartOfDay(to).getTime() - lagosStartOfDay(from).getTime()) / DAY_MS
  )
}

/** Payday in a given month: day 31 (or 30, 29) falls back to the month's last day. */
function paydayIn(year: number, month: number, paydayDay: number): Ymd {
  return { year, month, day: Math.min(paydayDay, daysInMonth(year, month)) }
}

/** Next payday on or after today (Lagos), as YYYY-MM-DD. */
export function nextPayday(paydayDay: number, now = new Date()): string {
  const today = lagosYmd(now)
  const thisMonth = paydayIn(today.year, today.month, paydayDay)
  if (thisMonth.day >= today.day) return formatYmd(thisMonth)
  const next = addMonths(today, 1)
  return formatYmd(paydayIn(next.year, next.month, paydayDay))
}

function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th"
  return `${n}${suffix}`
}

/** 28 → "28th of every month"; 31 → "Last day of every month" */
export function paydayLabel(paydayDay: number): string {
  return paydayDay >= 31
    ? "Last day of every month"
    : `${ordinal(paydayDay)} of every month`
}
