import { ReportScheduleRepository } from '@infrastructure/repositories/settings/report-schedule.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  mutateBusinessSettings,
  findBusinessSettings,
} from '@infrastructure/repositories/settings/json-settings';

jest.mock('@infrastructure/repositories/settings/json-settings', () => ({
  mutateBusinessSettings: jest.fn(),
  findBusinessSettings: jest.fn(),
}));

describe('durable report delivery state', () => {
  let settings: Record<string, unknown>;
  let repo: ReportScheduleRepository;
  const now = new Date('2026-10-24T00:00:00Z');
  beforeEach(() => {
    settings = {
      brandColor: 'blue',
      reportSchedules: [
        {
          id: 's',
          reportType: 'sales',
          frequency: 'daily',
          recipients: ['a@example.com'],
          isActive: true,
          nextSendAt: now.toISOString(),
          lastSentAt: null,
        },
      ],
    };
    repo = new ReportScheduleRepository({} as PrismaService);
    (mutateBusinessSettings as jest.Mock).mockImplementation(async (_db, businessId, fn) => {
      if (businessId !== 'business') throw new Error('Business not found');
      const value = fn(settings);
      settings = value.settings;
      return value.result;
    });
    (findBusinessSettings as jest.Mock).mockImplementation(async () => settings);
  });
  it('claims only once and retains unrelated settings', async () => {
    const [a, b] = await Promise.all([
      repo.claimDue('business', 's', now),
      repo.claimDue('business', 's', now),
    ]);
    expect(a).toMatchObject({ id: 's', lastStatus: 'processing', runId: expect.any(String) });
    expect(b).toBeNull();
    expect(settings.brandColor).toBe('blue');
  });
  it('rejects another tenant and does not claim inactive schedules', async () => {
    await expect(repo.claimDue('other', 's', now)).rejects.toThrow();
    await repo.updateReportSchedule('business', 's', { isActive: false });
    expect(await repo.claimDue('business', 's', now)).toBeNull();
  });
  it('records success only for the matching claim and advances the schedule', async () => {
    const claim = (await repo.claimDue('business', 's', now))!;
    expect(await repo.finishRun('business', 's', 'wrong', 'sent', null, now)).toBe(false);
    expect(await repo.finishRun('business', 's', claim.runId!, 'sent', null, now)).toBe(true);
    expect((await repo.getReportSchedules('business'))[0]).toMatchObject({
      lastStatus: 'sent',
      lastSentAt: now.toISOString(),
      nextSendAt: '2026-10-25T00:00:00.000Z',
    });
  });
  it('retries a safe pre-delivery failure after 15 minutes with the original period', async () => {
    const claim = (await repo.claimDue('business', 's', now))!;
    await repo.finishRun('business', 's', claim.runId!, 'failed', 'NOT_CONFIGURED', now);
    expect(await repo.claimDue('business', 's', new Date(now.getTime() + 60000))).toBeNull();
    const retry = await repo.claimDue('business', 's', new Date(now.getTime() + 15 * 60000));
    expect(retry?.scheduledFor).toBe(now.toISOString());
  });
  it('does not resend an interrupted claim and prevents edits while it is running', async () => {
    await repo.claimDue('business', 's', now);
    await expect(
      repo.updateReportSchedule('business', 's', { recipients: ['b@example.com'] }),
    ).rejects.toThrow();
    await expect(repo.deleteReportSchedule('business', 's')).rejects.toThrow();
    expect(await repo.claimDue('business', 's', new Date(now.getTime() + 31 * 60000))).toBeNull();
    expect((await repo.getReportSchedules('business'))[0]).toMatchObject({
      lastStatus: 'unknown',
      lastError: 'DELIVERY_INTERRUPTED',
      lastSentAt: null,
    });
  });
  it('initializes legacy schedules without sending historical reports immediately', async () => {
    (settings.reportSchedules as { nextSendAt: string | null }[])[0].nextSendAt = null;
    expect(await repo.claimDue('business', 's', now)).toBeNull();
    expect((await repo.getReportSchedules('business'))[0].nextSendAt).toBe(
      '2026-10-25T00:00:00.000Z',
    );
  });
  it('fences a stale worker before it can start another SMTP request', async () => {
    const claim = (await repo.claimDue('business', 's', now))!;
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now.getTime() + 29 * 60_000);
    try {
      expect(await repo.isCurrentRun('business', 's', claim.runId!)).toBe(false);
    } finally {
      clock.mockRestore();
    }
  });
});
