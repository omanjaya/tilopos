import { BadRequestException } from '@nestjs/common';
import {
  businessDayRange,
  endOfBusinessDay,
  parseBusinessDate,
  startOfBusinessDay,
  startOfBusinessMonth,
  startOfBusinessWeek,
} from '@shared/utils/business-time';

/** Longest custom range a report may cover (R13: bounded report queries). */
export const MAX_REPORT_RANGE_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Parses a report date. `YYYY-MM-DD` is a WIB business date (preferred, R14);
 * a full ISO timestamp is accepted for older clients and mapped to the
 * business day that contains it.
 */
function parseReportDay(value: string): { start: Date; end: Date } {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const range = parseBusinessDate(value);
    if (isNaN(range.start.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }
    return range;
  }
  const instant = new Date(value);
  if (isNaN(instant.getTime())) {
    throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
  }
  return businessDayRange(instant);
}

/**
 * Report date range in Asia/Jakarta business time (Docs/ENGINEERING-RULES.md R14).
 * Custom ranges are inclusive of the whole end day and capped at
 * MAX_REPORT_RANGE_DAYS.
 */
export function getDateRange(
  dateRange?: string,
  startDate?: string,
  endDate?: string,
  now: Date = new Date(),
): { start: Date; end: Date } {
  const end = endOfBusinessDay(now);

  if (startDate && endDate) {
    const start = parseReportDay(startDate).start;
    const endParsed = parseReportDay(endDate).end;

    if (start > endParsed) {
      throw new BadRequestException('Start date must be before or equal to end date');
    }
    if (endParsed.getTime() - start.getTime() > MAX_REPORT_RANGE_DAYS * DAY_MS) {
      throw new BadRequestException(`Date range cannot exceed ${MAX_REPORT_RANGE_DAYS} days`);
    }
    return { start, end: endParsed };
  }

  switch (dateRange) {
    case 'today':
      return { start: startOfBusinessDay(now), end };
    case 'this_week':
      return { start: startOfBusinessWeek(now), end };
    case 'this_year':
      return {
        start: parseBusinessDate(`${businessDateString(now).slice(0, 4)}-01-01`).start,
        end,
      };
    case 'this_month':
    default:
      return { start: startOfBusinessMonth(now), end };
  }
}

/** YYYY-MM-DD of `date` in WIB — the key for per-day report buckets. */
export function businessDateString(date: Date): string {
  const shifted = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/** Day of week (0 = Sunday) of `date` in WIB. */
export function businessWeekday(date: Date): number {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).getUTCDay();
}
