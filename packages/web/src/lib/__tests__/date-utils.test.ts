import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPreviousPeriod } from '../date-utils';

describe('getPreviousPeriod', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 00:30 local time on 15 March 2026 — in UTC+7 this is still 14 March in UTC.
    vi.setSystemTime(new Date(2026, 2, 15, 0, 30));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns yesterday as a local YYYY-MM-DD date for "today"', () => {
    expect(getPreviousPeriod('today')).toEqual({ startDate: '2026-03-14', endDate: '2026-03-14' });
  });

  it('returns the full previous month in local dates for "this_month"', () => {
    expect(getPreviousPeriod('this_month')).toEqual({ startDate: '2026-02-01', endDate: '2026-02-28' });
  });
});
