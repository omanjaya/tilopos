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
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Format percentage change for display
 */
export function formatPercentageChange(change: number): string {
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}
