import { createServer, Server } from 'net';
import { AddressInfo } from 'net';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ReportScheduleRepository } from '@infrastructure/repositories/settings/report-schedule.repository';
import { ScheduledReportRenderer } from '../scheduled-report.renderer';
import { ReportScheduleScheduler } from '../report-schedule.scheduler';
import { PdfGeneratorService } from '@infrastructure/export/pdf-generator.service';
import { ExcelGeneratorService } from '@infrastructure/export/excel-generator.service';
import { GenerateSalesReportUseCase } from '@application/use-cases/reports/generate-sales-report.use-case';
import { GenerateInventoryReportUseCase } from '@application/use-cases/reports/generate-inventory-report.use-case';
import { AnalyticsQueriesService } from '@infrastructure/services/analytics-queries.service';
import { EmailService } from '@infrastructure/notifications/email/email.service';
import { DistributedLockService } from '@shared/locks/distributed-lock.service';

const integration = process.env.REPORT_TEST_DATABASE_URL ? describe : describe.skip;
integration('report schedules with PostgreSQL and a local SMTP receiver', () => {
  let db: PrismaService, repo: ReportScheduleRepository, renderer: ScheduledReportRenderer;
  let businessId: string, otherBusinessId: string, outletId: string;
  let smtp: Server, port: number;
  const messages: string[] = [];
  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.REPORT_TEST_DATABASE_URL;
    db = new PrismaService();
    await db.$connect();
    repo = new ReportScheduleRepository(db);
    const pdf = new PdfGeneratorService(),
      excel = new ExcelGeneratorService();
    renderer = new ScheduledReportRenderer(
      db,
      new GenerateSalesReportUseCase(db, pdf, excel),
      new GenerateInventoryReportUseCase(db, pdf, excel),
      new AnalyticsQueriesService(db),
      pdf,
    );
    // Test-only loopback SMTP sink. No message leaves this process.
    smtp = createServer((socket) => {
      socket.write('220 local-test ESMTP\r\n');
      let buffer = '',
        data = false,
        message = '';
      socket.on('data', (chunk) => {
        buffer += chunk.toString();
        let index: number;
        while ((index = buffer.indexOf('\r\n')) >= 0) {
          const line = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          if (data) {
            if (line === '.') {
              messages.push(message);
              message = '';
              data = false;
              socket.write('250 queued\r\n');
            } else message += line + '\r\n';
          } else if (line.startsWith('EHLO')) socket.write('250-local-test\r\n250 PIPELINING\r\n');
          else if (line === 'DATA') {
            data = true;
            socket.write('354 send content\r\n');
          } else if (line === 'QUIT') socket.end('221 bye\r\n');
          else socket.write('250 OK\r\n');
        }
      });
    });
    await new Promise<void>((resolve) => smtp.listen(0, '127.0.0.1', resolve));
    port = (smtp.address() as AddressInfo).port;
  });
  beforeEach(async () => {
    messages.length = 0;
    businessId = randomUUID();
    otherBusinessId = randomUUID();
    outletId = randomUUID();
    await db.business.createMany({
      data: [
        { id: businessId, name: 'Report test', settings: { brandColor: 'blue' } },
        { id: otherBusinessId, name: 'Other tenant' },
      ],
    });
    await db.outlet.create({ data: { id: outletId, businessId, name: 'Report outlet' } });
  });
  afterEach(async () => {
    await db.outlet.deleteMany({ where: { businessId } });
    await db.business.deleteMany({ where: { id: { in: [businessId, otherBusinessId] } } });
  });
  afterAll(async () => {
    await db.$disconnect();
    await new Promise<void>((resolve, reject) =>
      smtp.close((err) => (err ? reject(err) : resolve())),
    );
  });
  async function due() {
    const s = await repo.createReportSchedule(businessId, {
      reportType: 'sales',
      frequency: 'daily',
      recipients: ['recipient@example.test'],
    });
    await db.business.update({
      where: { id: businessId },
      data: {
        settings: {
          brandColor: 'blue',
          reportSchedules: [{ ...s, nextSendAt: new Date(Date.now() - 60000).toISOString() }],
        },
      },
    });
    return s;
  }
  it('serializes competing workers and rejects cross-tenant schedule IDs', async () => {
    const s = await due();
    const claims = await Promise.all(
      Array.from({ length: 4 }, () => repo.claimDue(businessId, s.id, new Date())),
    );
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(await repo.claimDue(otherBusinessId, s.id, new Date())).toBeNull();
    await expect(
      repo.updateReportSchedule(otherBusinessId, s.id, { isActive: false }),
    ).rejects.toThrow();
    expect(
      (await db.business.findUniqueOrThrow({ where: { id: businessId } })).settings,
    ).toMatchObject({ brandColor: 'blue' });
  });
  it('renders all three real PDF reports from scoped data', async () => {
    for (const type of ['sales', 'financial', 'inventory'] as const) {
      const attachments = await renderer.render(businessId, type, {
        startDate: '2026-10-01',
        endDate: '2026-10-23',
      });
      expect(attachments).toHaveLength(1);
      expect((attachments[0].content as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    }
    await expect(
      renderer.render(otherBusinessId, 'sales', { startDate: '2026-10-01', endDate: '2026-10-23' }),
    ).rejects.toThrow();
  });
  it('delivers a PDF exactly once to local SMTP across competing workers', async () => {
    const s = await due();
    const email = new EmailService(
      new ConfigService({
        SMTP_HOST: '127.0.0.1',
        SMTP_PORT: port,
        SMTP_FROM: 'sender@example.test',
      }),
    );
    const worker = new ReportScheduleScheduler(
      db,
      repo,
      renderer,
      email,
      {} as DistributedLockService,
    );
    await Promise.all([worker.deliver(businessId, s.id), worker.deliver(businessId, s.id)]);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('application/pdf');
    expect((await repo.getReportSchedules(businessId))[0]).toMatchObject({
      lastStatus: 'sent',
      lastError: null,
      lastSentAt: expect.any(String),
    });
    await worker.deliver(businessId, s.id);
    expect(messages).toHaveLength(1);
  });
});
