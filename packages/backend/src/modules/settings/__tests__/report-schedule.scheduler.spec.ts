import { ReportScheduleScheduler } from '../report-schedule.scheduler';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ReportScheduleRepository } from '@infrastructure/repositories/settings/report-schedule.repository';
import { ScheduledReportRenderer } from '../scheduled-report.renderer';
import { EmailService } from '@infrastructure/notifications/email/email.service';
import { DistributedLockService } from '@shared/locks/distributed-lock.service';

describe('scheduled report delivery', () => {
  const repo = { claimDue: jest.fn(), finishRun: jest.fn(), isCurrentRun: jest.fn() };
  const renderer = { render: jest.fn() };
  const email = { isConfigured: jest.fn(), send: jest.fn() };
  const lock = { runExclusive: jest.fn() };
  const prisma = { business: { findMany: jest.fn() } };
  let scheduler: ReportScheduleScheduler;
  const claim = {
    id: 's',
    reportType: 'sales' as const,
    frequency: 'daily' as const,
    recipients: ['a@example.com', 'b@example.com'],
    isActive: true,
    nextSendAt: '2026-10-24T00:00:00Z',
    lastSentAt: null,
    scheduledFor: '2026-10-24T00:00:00Z',
    runId: 'run',
  };
  beforeEach(() => {
    jest.resetAllMocks();
    repo.claimDue.mockResolvedValue(claim);
    repo.isCurrentRun.mockResolvedValue(true);
    email.isConfigured.mockReturnValue(true);
    email.send.mockResolvedValue(undefined);
    renderer.render.mockResolvedValue([
      { filename: 'report.pdf', content: Buffer.from('report'), contentType: 'application/pdf' },
    ]);
    scheduler = new ReportScheduleScheduler(
      prisma as unknown as PrismaService,
      repo as unknown as ReportScheduleRepository,
      renderer as unknown as ScheduledReportRenderer,
      email as unknown as EmailService,
      lock as unknown as DistributedLockService,
    );
  });
  it('claims a persisted schedule and renders only its business and completed period', async () => {
    await scheduler.deliver('business', 's');
    expect(renderer.render).toHaveBeenCalledWith('business', 'sales', {
      startDate: '2026-10-23',
      endDate: '2026-10-23',
    });
    expect(email.send).toHaveBeenCalledTimes(2);
    expect(email.send.mock.calls[0][0]).toMatchObject({
      to: 'a@example.com',
      attachments: [
        { filename: 'report.pdf', content: expect.any(Buffer), contentType: 'application/pdf' },
      ],
    });
    expect(repo.finishRun).toHaveBeenCalledWith(
      'business',
      's',
      'run',
      'sent',
      null,
      expect.any(Date),
    );
  });
  it('records NOT_CONFIGURED without rendering or pretending delivery succeeded', async () => {
    email.isConfigured.mockReturnValue(false);
    await scheduler.deliver('business', 's');
    expect(renderer.render).not.toHaveBeenCalled();
    expect(email.send).not.toHaveBeenCalled();
    expect(repo.finishRun).toHaveBeenCalledWith(
      'business',
      's',
      'run',
      'failed',
      'NOT_CONFIGURED',
      expect.any(Date),
    );
  });
  it('treats rendering errors as safe to retry and SMTP errors as uncertain', async () => {
    renderer.render.mockRejectedValueOnce(new Error('internal details'));
    await scheduler.deliver('business', 's');
    expect(repo.finishRun).toHaveBeenLastCalledWith(
      'business',
      's',
      'run',
      'failed',
      'REPORT_GENERATION_FAILED',
      expect.any(Date),
    );
    await scheduler.deliver('business', 's');
    email.send.mockRejectedValueOnce(new Error('credentials must not reach UI'));
    await scheduler.deliver('business', 's');
    expect(repo.finishRun).toHaveBeenLastCalledWith(
      'business',
      's',
      'run',
      'unknown',
      'DELIVERY_UNCONFIRMED',
      expect.any(Date),
    );
  });
  it('does not send without a claim or after its fencing token has expired', async () => {
    repo.claimDue.mockResolvedValueOnce(null);
    await scheduler.deliver('business', 's');
    expect(email.send).not.toHaveBeenCalled();
    repo.isCurrentRun.mockResolvedValue(false);
    await scheduler.deliver('business', 's');
    expect(email.send).not.toHaveBeenCalled();
  });
  it('uses a distributed lock for cron execution', async () => {
    lock.runExclusive.mockResolvedValue(undefined);
    await scheduler.tick();
    expect(lock.runExclusive).toHaveBeenCalledWith('report-schedules', 600, expect.any(Function));
    expect(prisma.business.findMany).not.toHaveBeenCalled();
  });
  it('scans active businesses in pages and isolates due schedules from inactive/future ones', async () => {
    lock.runExclusive.mockImplementation(async (_key, _ttl, work) => work());
    const due = new Date(Date.now() - 60_000).toISOString();
    const future = new Date(Date.now() + 60_000).toISOString();
    prisma.business.findMany.mockResolvedValue([
      {
        id: 'a',
        settings: {
          reportSchedules: [
            { id: 'due', isActive: true, nextSendAt: due },
            { id: 'off', isActive: false, nextSendAt: due },
            { id: 'future', isActive: true, nextSendAt: future },
          ],
        },
      },
      {
        id: 'b',
        settings: { reportSchedules: [{ id: 'legacy', isActive: true, nextSendAt: null }] },
      },
    ]);
    const deliver = jest
      .spyOn(scheduler, 'deliver')
      .mockRejectedValueOnce(new Error('isolated failure'))
      .mockResolvedValue(undefined);
    await scheduler.tick();
    expect(prisma.business.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'active' }, take: 25 }),
    );
    expect(deliver.mock.calls).toEqual([
      ['a', 'due'],
      ['b', 'legacy'],
    ]);
  });
});
