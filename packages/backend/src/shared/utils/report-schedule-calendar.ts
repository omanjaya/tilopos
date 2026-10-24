import {
  addBusinessDays,
  businessDateKey,
  startOfBusinessDay,
  startOfBusinessMonth,
  startOfBusinessWeek,
} from '@shared/utils/business-time';

export type ReportFrequency = 'daily' | 'weekly' | 'monthly';
const HOUR = 60 * 60 * 1000;
const dateString = (date: Date) =>
  businessDateKey(date).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');

/** 07:00 WIB on the next day, Monday or first of month; strictly in the future. */
export function nextReportSendAt(frequency: ReportFrequency, after: Date): string {
  const base =
    frequency === 'daily'
      ? startOfBusinessDay(after)
      : frequency === 'weekly'
        ? startOfBusinessWeek(after)
        : startOfBusinessMonth(after);
  let candidate = new Date(base.getTime() + 7 * HOUR);
  if (candidate <= after) {
    if (frequency === 'monthly') {
      candidate = new Date(Date.UTC(candidate.getUTCFullYear(), candidate.getUTCMonth() + 1, 1));
    } else {
      candidate = addBusinessDays(candidate, frequency === 'weekly' ? 7 : 1);
    }
  }
  return candidate.toISOString();
}

/** The completed WIB period preceding this scheduled occurrence. */
export function reportPeriod(frequency: ReportFrequency, scheduledFor: string) {
  const due = new Date(scheduledFor);
  const end = addBusinessDays(
    frequency === 'daily'
      ? startOfBusinessDay(due)
      : frequency === 'weekly'
        ? startOfBusinessWeek(due)
        : startOfBusinessMonth(due),
    -1,
  );
  const start =
    frequency === 'daily'
      ? end
      : frequency === 'weekly'
        ? addBusinessDays(end, -6)
        : startOfBusinessMonth(end);
  return { startDate: dateString(start), endDate: dateString(end) };
}
