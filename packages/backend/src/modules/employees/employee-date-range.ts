import { BadRequestException } from '@nestjs/common';
import { parseBusinessDate } from '@shared/utils/business-time';

/** Longest range any employee report may cover. */
export const MAX_REPORT_RANGE_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Resolves a report range (Docs/ENGINEERING-RULES.md R14):
 * a `YYYY-MM-DD` value is a WIB business day, so `from` is its 00:00 WIB and
 * `to` is its last millisecond (the last day is included). Full ISO timestamps
 * are used as-is. Ranges are capped at MAX_REPORT_RANGE_DAYS.
 */
export function resolveReportRange(from: string, to: string): { from: Date; to: Date } {
  const start = DATE_ONLY.test(from) ? parseBusinessDate(from).start : new Date(from);
  const end = DATE_ONLY.test(to) ? parseBusinessDate(to).end : new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new BadRequestException('Invalid date range');
  }
  if (end.getTime() < start.getTime()) {
    throw new BadRequestException('"to" must not be before "from"');
  }
  if (end.getTime() - start.getTime() > MAX_REPORT_RANGE_DAYS * DAY_MS) {
    throw new BadRequestException(`Date range may not exceed ${MAX_REPORT_RANGE_DAYS} days`);
  }
  return { from: start, to: end };
}

/** `YYYY-MM-DD` of the WIB business day containing `date`. */
export function businessDateString(date: Date): string {
  const shifted = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/** `HH:mm` wall-clock time in WIB. */
export function businessTimeString(date: Date): string {
  const shifted = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return shifted.toISOString().slice(11, 16);
}
