import { nextReportSendAt, reportPeriod } from '@shared/utils/report-schedule-calendar';

describe('report schedule WIB calendar', () => {
  it('schedules daily at 07:00 WIB, strictly after the supplied instant', () => {
    expect(nextReportSendAt('daily', new Date('2026-10-23T23:59:00Z'))).toBe(
      '2026-10-24T00:00:00.000Z',
    );
    expect(nextReportSendAt('daily', new Date('2026-10-24T00:00:00Z'))).toBe(
      '2026-10-25T00:00:00.000Z',
    );
  });
  it('schedules Monday and first-of-month, including year rollover', () => {
    expect(nextReportSendAt('weekly', new Date('2026-10-24T01:00:00Z'))).toBe(
      '2026-10-26T00:00:00.000Z',
    );
    expect(nextReportSendAt('monthly', new Date('2026-12-31T18:00:00Z'))).toBe(
      '2027-01-01T00:00:00.000Z',
    );
  });
  it('renders the previous complete period, including leap February', () => {
    expect(reportPeriod('daily', '2026-10-24T00:00:00Z')).toEqual({
      startDate: '2026-10-23',
      endDate: '2026-10-23',
    });
    expect(reportPeriod('weekly', '2026-10-26T00:00:00Z')).toEqual({
      startDate: '2026-10-19',
      endDate: '2026-10-25',
    });
    expect(reportPeriod('monthly', '2028-03-01T00:00:00Z')).toEqual({
      startDate: '2028-02-01',
      endDate: '2028-02-29',
    });
  });
});
