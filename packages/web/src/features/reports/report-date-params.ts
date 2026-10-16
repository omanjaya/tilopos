import { format } from 'date-fns';
import type { DateRange } from '@/types/report.types';
import type { DateRange as DateRangeValue } from '@/components/shared/date-range-picker';

/**
 * Custom report ranges are sent as local business dates (YYYY-MM-DD), never as
 * toISOString() of local midnight (Docs/ENGINEERING-RULES.md R14).
 * `ready` is false while a custom range is incomplete, so queries wait for both dates.
 */
export function reportDateParams(dateRange: DateRange, custom?: DateRangeValue) {
  const startDate = dateRange === 'custom' && custom?.from ? format(custom.from, 'yyyy-MM-dd') : undefined;
  const endDate = dateRange === 'custom' && custom?.to ? format(custom.to, 'yyyy-MM-dd') : undefined;
  const ready = dateRange !== 'custom' || (!!startDate && !!endDate);
  return { startDate, endDate, ready };
}
