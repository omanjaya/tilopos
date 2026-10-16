import {
  businessDateKey,
  businessDayRange,
  businessHour,
  parseBusinessDate,
  startOfBusinessMonth,
  startOfBusinessWeek,
} from './business-time';

describe('business-time (Asia/Jakarta)', () => {
  it('starts the business day at 00:00 WIB (17:00 UTC the previous day)', () => {
    // 2026-09-27 01:30 WIB == 2026-09-26 18:30 UTC
    const { start, end } = businessDayRange(new Date('2026-09-26T18:30:00Z'));
    expect(start.toISOString()).toBe('2026-09-26T17:00:00.000Z');
    expect(end.toISOString()).toBe('2026-09-27T16:59:59.999Z');
  });

  it('keys the date by the WIB calendar day', () => {
    expect(businessDateKey(new Date('2026-09-26T18:30:00Z'))).toBe('20260927');
    expect(businessDateKey(new Date('2026-09-26T16:59:00Z'))).toBe('20260926');
  });

  it('starts weeks on Monday WIB', () => {
    // Sunday 2026-09-27 10:00 WIB -> Monday 2026-09-21 00:00 WIB
    expect(startOfBusinessWeek(new Date('2026-09-27T03:00:00Z')).toISOString()).toBe(
      '2026-09-20T17:00:00.000Z',
    );
  });

  it('starts months on the 1st WIB', () => {
    expect(startOfBusinessMonth(new Date('2026-10-01T02:00:00Z')).toISOString()).toBe(
      '2026-09-30T17:00:00.000Z',
    );
  });

  it('parses YYYY-MM-DD as a WIB day', () => {
    expect(parseBusinessDate('2026-01-05').start.toISOString()).toBe('2026-01-04T17:00:00.000Z');
    expect(() => parseBusinessDate('05/01/2026')).toThrow();
  });

  it('reports the WIB hour', () => {
    expect(businessHour(new Date('2026-09-26T18:30:00Z'))).toBe(1);
  });
});
