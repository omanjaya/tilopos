import {
  subDays,
  subMonths,
  subWeeks,
  subYears,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from 'date-fns';
import type { DateRange } from '@/types/report.types';

/**
 * Calculate the previous period for comparison metrics
 * Uses proper date-fns functions to ensure accurate period calculations
 */
export function getPreviousPeriod(
  dateRange: DateRange,
  customDateRange?: { from?: Date; to?: Date }
): { startDate: string; endDate: string } | null {
  const today = new Date();

  // For custom date range, calculate the period length and go back by the same amount
  if (dateRange === 'custom' && customDateRange?.from && customDateRange?.to) {
    const from = customDateRange.from;
    const to = customDateRange.to;
    const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

    const prevTo = subDays(from, 1);
    const prevFrom = subDays(prevTo, daysDiff);

    return {
      startDate: formatDate(prevFrom),
      endDate: formatDate(prevTo),
    };
  }

  // Calculate previous period based on preset range
  switch (dateRange) {
    case 'today': {
      // Previous period = yesterday
      const yesterday = subDays(today, 1);
      return {
        startDate: formatDate(startOfDay(yesterday)),
        endDate: formatDate(endOfDay(yesterday)),
      };
    }
    case 'this_week': {
      // Previous period = last week (same week structure)
      const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
      const lastWeekStart = subWeeks(currentWeekStart, 1);
      const lastWeekEnd = endOfWeek(lastWeekStart, { weekStartsOn: 1 });
      return {
        startDate: formatDate(lastWeekStart),
        endDate: formatDate(lastWeekEnd),
      };
    }
    case 'this_month': {
      // Previous period = last month (full month)
      const currentMonthStart = startOfMonth(today);
      const lastMonthStart = subMonths(currentMonthStart, 1);
      const lastMonthEnd = endOfMonth(lastMonthStart);
      return {
        startDate: formatDate(lastMonthStart),
        endDate: formatDate(lastMonthEnd),
      };
    }
    case 'this_year': {
      // Previous period = last year (full year)
      const currentYearStart = startOfYear(today);
      const lastYearStart = subYears(currentYearStart, 1);
      const lastYearEnd = endOfYear(lastYearStart);
      return {
        startDate: formatDate(lastYearStart),
        endDate: formatDate(lastYearEnd),
      };
    }
    default:
      return null;
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] || '';
}

/**
 * Calculate percentage change between two values
 *
 * Handles edge cases:
 * - previous = 0: returns 100 if current > 0, -100 if current < 0, 0 if current = 0
 * - NaN/Infinity: returns 0
 * - null/undefined: returns 0
 *
 * @param current - Current period value
 * @param previous - Previous period value
 * @returns Percentage change
 */
export function calculatePercentageChange(
  current: number | null | undefined,
  previous: number | null | undefined
): number {
  // Handle null/undefined
  if (current === null || current === undefined) current = 0;
  if (previous === null || previous === undefined) previous = 0;

  // Handle non-finite numbers
  if (!isFinite(current) || !isFinite(previous)) return 0;

  // Handle division by zero
  if (previous === 0) {
    if (current > 0) return 100;
    if (current < 0) return -100;
    return 0;
  }

  const change = ((current - previous) / previous) * 100;

  // Handle result overflow
  return isFinite(change) ? change : 0;
}

/**
 * Format percentage change for display
 *
 * @param change - Percentage change value
 * @returns Formatted string with sign and %
 *
 * @example
 * ```tsx
 * formatPercentageChange(15.5) // "+15.5%"
 * formatPercentageChange(-10.2) // "-10.2%"
 * formatPercentageChange(0) // "0.0%"
 * ```
 */
export function formatPercentageChange(change: number | null | undefined): string {
  if (change === null || change === undefined || !isFinite(change)) {
    return '0.0%';
  }

  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

/**
 * Check if a date is valid
 *
 * @param date - Date to check
 * @returns True if valid date
 *
 * @example
 * ```tsx
 * if (!isValidDate(userInput)) {
 *   errors.date = 'Tanggal tidak valid';
 * }
 * ```
 */
export function isValidDate(date: string | Date | null | undefined): boolean {
  if (!date) return false;

  try {
    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime());
  } catch {
    return false;
  }
}

/**
 * Check if date is in the future
 *
 * @param date - Date to check
 * @returns True if date is in the future
 *
 * @example
 * ```tsx
 * if (isFutureDate(selectedDate)) {
 *   errors.date = 'Tanggal tidak boleh di masa depan';
 * }
 * ```
 */
export function isFutureDate(date: string | Date): boolean {
  if (!isValidDate(date)) return false;
  return new Date(date) > new Date();
}

/**
 * Check if date is in the past
 *
 * @param date - Date to check
 * @returns True if date is in the past
 */
export function isPastDate(date: string | Date): boolean {
  if (!isValidDate(date)) return false;
  return new Date(date) < new Date();
}
