/** Payday dates are calendar dates in Nigeria (WAT, UTC+1, no daylight saving). */
const LAGOS_OFFSET_MS = 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Today's calendar date in Lagos as { year, monthIndex, day }. */
export function lagosToday(now: Date = new Date()): {
  year: number;
  monthIndex: number;
  day: number;
} {
  const lagos = new Date(now.getTime() + LAGOS_OFFSET_MS);
  return { year: lagos.getUTCFullYear(), monthIndex: lagos.getUTCMonth(), day: lagos.getUTCDate() };
}

/**
 * Next payday (today counts) as `YYYY-MM-DD`. A payday of 31 falls on the last
 * day of shorter months (e.g. 30 Apr, 28/29 Feb).
 */
export function nextPayday(paydayDay: number, now: Date = new Date()): string {
  const today = lagosToday(now);
  let { year, monthIndex } = today;

  let day = Math.min(paydayDay, daysInMonth(year, monthIndex));
  if (day < today.day) {
    monthIndex += 1;
    if (monthIndex > 11) {
      monthIndex = 0;
      year += 1;
    }
    day = Math.min(paydayDay, daysInMonth(year, monthIndex));
  }
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

/** First instant of the current calendar month in Lagos, as a UTC Date. */
export function startOfLagosMonth(now: Date = new Date()): Date {
  const { year, monthIndex } = lagosToday(now);
  return new Date(Date.UTC(year, monthIndex, 1) - LAGOS_OFFSET_MS);
}

/** `YYYY-MM-DD` (a Lagos calendar date) → the UTC instant that day starts. */
export function lagosDayStart(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) - LAGOS_OFFSET_MS);
}

/** `YYYY-MM-DD` → the UTC instant the following Lagos day starts (exclusive end). */
export function lagosDayEnd(date: string): Date {
  return new Date(lagosDayStart(date).getTime() + 24 * 60 * 60 * 1000);
}

/** 28 → "28th". */
export function ordinal(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  return `${day}${['th', 'st', 'nd', 'rd'][day % 10] ?? 'th'}`;
}
