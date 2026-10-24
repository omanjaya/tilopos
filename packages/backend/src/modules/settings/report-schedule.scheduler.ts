import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ReportScheduleRepository } from '@infrastructure/repositories/settings/report-schedule.repository';
import { asJsonObject } from '@infrastructure/repositories/settings/json-settings';
import { EmailService } from '@infrastructure/notifications/email/email.service';
import { DistributedLockService } from '@shared/locks/distributed-lock.service';
import { BUSINESS_TZ } from '@shared/utils/business-time';
import { reportPeriod } from '@shared/utils/report-schedule-calendar';
import { ScheduledReportRenderer } from './scheduled-report.renderer';

@Injectable()
export class ReportScheduleScheduler {
  private readonly logger = new Logger(ReportScheduleScheduler.name);
  private cursor: string | undefined;
  constructor(
    private readonly prisma: PrismaService,
    private readonly schedules: ReportScheduleRepository,
    private readonly renderer: ScheduledReportRenderer,
    private readonly email: EmailService,
    private readonly lock: DistributedLockService,
  ) {}

  @Cron('0 * * * * *', { timeZone: BUSINESS_TZ })
  async tick(): Promise<void> {
    await this.lock.runExclusive('report-schedules', 600, async () => {
      const deadline = Date.now() + 4 * 60_000;
      do {
        // Cross-tenant enumeration is limited to this system job; each delivery is scoped.
        const businesses = await this.prisma.business.findMany({
          where: { status: 'active' },
          select: { id: true, settings: true },
          orderBy: { id: 'asc' },
          take: 25,
          ...(this.cursor ? { cursor: { id: this.cursor }, skip: 1 } : {}),
        });
        if (!businesses.length) {
          this.cursor = undefined;
          break;
        }
        for (const business of businesses) {
          const raw = asJsonObject(business.settings).reportSchedules;
          if (Array.isArray(raw)) {
            for (const item of raw) {
              const s = asJsonObject(item);
              if (
                typeof s.id === 'string' &&
                s.isActive === true &&
                (!s.nextSendAt || new Date(String(s.nextSendAt)).getTime() <= Date.now())
              ) {
                try {
                  await this.deliver(business.id, s.id);
                } catch {
                  this.logger.error(
                    `Report delivery state failed: business=${business.id} schedule=${s.id}`,
                  );
                }
              }
              if (Date.now() >= deadline) return;
            }
          }
          this.cursor = business.id;
          if (Date.now() >= deadline) return;
        }
        if (businesses.length < 25) {
          this.cursor = undefined;
          break;
        }
      } while (Date.now() < deadline);
    });
  }

  async deliver(businessId: string, scheduleId: string): Promise<void> {
    const schedule = await this.schedules.claimDue(businessId, scheduleId, new Date());
    if (!schedule?.runId || !schedule.scheduledFor) return;
    const runId = schedule.runId;
    let deliveryStarted = false;
    try {
      if (!this.email.isConfigured()) {
        this.logger.warn(
          `Scheduled report blocked: NOT_CONFIGURED business=${businessId} schedule=${scheduleId}`,
        );
        await this.schedules.finishRun(
          businessId,
          scheduleId,
          runId,
          'failed',
          'NOT_CONFIGURED',
          new Date(),
        );
        return;
      }
      const period = reportPeriod(schedule.frequency, schedule.scheduledFor);
      const attachments = await this.renderer.render(businessId, schedule.reportType, period);
      const label = { sales: 'Penjualan', financial: 'Keuangan', inventory: 'Inventori' }[
        schedule.reportType
      ];
      for (const to of [...new Set(schedule.recipients)]) {
        if (!(await this.schedules.isCurrentRun(businessId, scheduleId, runId))) return;
        deliveryStarted = true;
        await this.email.send({
          to,
          subject: `Laporan ${label} TiloPOS: ${period.startDate} - ${period.endDate}`,
          html: `<p>Laporan ${label} terlampir untuk periode ${period.startDate} sampai ${period.endDate} (WIB), seluruh outlet bisnis.</p>${schedule.reportType === 'inventory' ? '<p>Inventori adalah snapshot saat laporan dibuat, bukan stok historis.</p>' : ''}`,
          attachments,
        });
      }
      await this.schedules.finishRun(businessId, scheduleId, runId, 'sent', null, new Date());
    } catch {
      const status = deliveryStarted ? 'unknown' : 'failed';
      const reason = deliveryStarted ? 'DELIVERY_UNCONFIRMED' : 'REPORT_GENERATION_FAILED';
      this.logger.error(
        `Scheduled report ${reason}: business=${businessId} schedule=${scheduleId}`,
      );
      await this.schedules.finishRun(businessId, scheduleId, runId, status, reason, new Date());
    }
  }
}
