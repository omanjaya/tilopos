/**
 * Business calendar helpers (Docs/ENGINEERING-RULES.md R14).
 * Indonesia (WIB) has no DST, so Asia/Jakarta is a fixed UTC+07:00 offset.
 * Servers run in UTC — never use setHours()/getDate() for business days.
 */
export const BUSINESS_TZ = 'Asia/Jakarta';
const OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar parts of `date` as seen in Asia/Jakarta. */
function jakartaParts(date: Date): { year: number; month: number; day: number; weekday: number } {
  const shifted = new Date(date.getTime() + OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  };
}

/** UTC instant of 00:00 Asia/Jakarta on the given Jakarta calendar date. */
function jakartaMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day) - OFFSET_MS);
}

/** 00:00 WIB of the business day containing `date`. */
export function startOfBusinessDay(date: Date = new Date()): Date {
  const { year, month, day } = jakartaParts(date);
  return jakartaMidnight(year, month, day);
}

/** Last millisecond of the business day containing `date`. */
export function endOfBusinessDay(date: Date = new Date()): Date {
  return new Date(startOfBusinessDay(date).getTime() + DAY_MS - 1);
}

/** [start, end] of the business day containing `date`. */
export function businessDayRange(date: Date = new Date()): { start: Date; end: Date } {
  return { start: startOfBusinessDay(date), end: endOfBusinessDay(date) };
}

/** Monday 00:00 WIB of the business week containing `date`. */
export function startOfBusinessWeek(date: Date = new Date()): Date {
  const { year, month, day, weekday } = jakartaParts(date);
  const mondayOffset = weekday === 0 ? 6 : weekday - 1;
  return jakartaMidnight(year, month, day - mondayOffset);
}

/** First day 00:00 WIB of the business month containing `date`. */
export function startOfBusinessMonth(date: Date = new Date()): Date {
  const { year, month } = jakartaParts(date);
  return jakartaMidnight(year, month, 1);
}

/** Adds whole business days (safe because WIB has no DST). */
export function addBusinessDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * Parses a `YYYY-MM-DD` business date into the [start, end] instants of that
 * day in WIB. Throws on malformed input.
 */
export function parseBusinessDate(value: string): { start: Date; end: Date } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Invalid business date "${value}", expected YYYY-MM-DD`);
  }
  const start = jakartaMidnight(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return { start, end: new Date(start.getTime() + DAY_MS - 1) };
}

/** `YYYYMMDD` key of the business day containing `date` (for document numbers). */
export function businessDateKey(date: Date = new Date()): string {
  const { year, month, day } = jakartaParts(date);
  return `${year}${String(month + 1).padStart(2, '0')}${String(day).padStart(2, '0')}`;
}

/** Hour of day (0-23) in WIB, for hourly breakdowns. */
export function businessHour(date: Date): number {
  return new Date(date.getTime() + OFFSET_MS).getUTCHours();
}
