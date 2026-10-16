import { BadRequestException } from '@nestjs/common';
import { businessDateString, businessWeekday, getDateRange } from './date-range.util';

describe('getDateRange (WIB business time)', () => {
  // 2026-09-27 01:30 WIB == 2026-09-26 18:30 UTC (a Sunday in Jakarta)
  const now = new Date('2026-09-26T18:30:00.000Z');

  it("'today' starts at 00:00 WIB, not UTC midnight", () => {
    const { start, end } = getDateRange('today', undefined, undefined, now);
    expect(start.toISOString()).toBe('2026-09-26T17:00:00.000Z');
    expect(end.toISOString()).toBe('2026-09-27T16:59:59.999Z');
  });

  it("'this_week' starts Monday 00:00 WIB", () => {
    const { start } = getDateRange('this_week', undefined, undefined, now);
    expect(start.toISOString()).toBe('2026-09-20T17:00:00.000Z');
  });

  it("'this_month' and 'this_year' start at WIB boundaries", () => {
    expect(getDateRange('this_month', undefined, undefined, now).start.toISOString()).toBe(
      '2026-08-31T17:00:00.000Z',
    );
    expect(getDateRange('this_year', undefined, undefined, now).start.toISOString()).toBe(
      '2025-12-31T17:00:00.000Z',
    );
  });

  it('custom YYYY-MM-DD range covers the whole WIB end day', () => {
    const { start, end } = getDateRange(undefined, '2026-09-01', '2026-09-02', now);
    expect(start.toISOString()).toBe('2026-08-31T17:00:00.000Z');
    expect(end.toISOString()).toBe('2026-09-02T16:59:59.999Z');
  });

  it('rejects invalid, reversed and over-long ranges', () => {
    expect(() => getDateRange(undefined, 'garbage', '2026-09-02', now)).toThrow(
      BadRequestException,
    );
    expect(() => getDateRange(undefined, '2026-09-03', '2026-09-02', now)).toThrow(
      BadRequestException,
    );
    expect(() => getDateRange(undefined, '2024-01-01', '2026-09-02', now)).toThrow(
      BadRequestException,
    );
  });

  it('buckets late-evening WIB sales on the WIB day', () => {
    const lateEvening = new Date('2026-09-26T18:30:00.000Z'); // 01:30 WIB on the 27th
    expect(businessDateString(lateEvening)).toBe('2026-09-27');
    expect(businessWeekday(lateEvening)).toBe(0);
  });
});
