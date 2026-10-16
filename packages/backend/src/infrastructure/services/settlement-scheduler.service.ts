import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AutoSettlementUseCase } from '../../application/use-cases/settlements/auto-settlement.use-case';
import { DistributedLockService } from '@shared/locks/distributed-lock.service';
import { BUSINESS_TZ, addBusinessDays, startOfBusinessDay } from '@shared/utils/business-time';

/** Page size when walking outlets, so one tick never loads every tenant at once. */
const OUTLET_BATCH = 200;

/**
 * The single daily settlement job (R9): runs once per cluster (distributed
 * lock) shortly after midnight Asia/Jakarta and settles the previous business
 * day. AutoSettlementUseCase is idempotent, so a re-run only refreshes pending rows.
 */
@Injectable()
export class SettlementSchedulerService {
  private readonly logger = new Logger(SettlementSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly autoSettlementUseCase: AutoSettlementUseCase,
    private readonly locks: DistributedLockService,
  ) {}

  @Cron('10 0 * * *', { name: 'daily-settlements', timeZone: BUSINESS_TZ })
  async scheduleDailySettlements(): Promise<void> {
    await this.locks.runExclusive('cron:daily-settlements', 60 * 60, () =>
      this.settleBusinessDay(addBusinessDays(startOfBusinessDay(new Date()), -1)),
    );
  }

  /** Settles `day` (any instant within the WIB business day) for every active outlet. */
  async settleBusinessDay(day: Date): Promise<{ outlets: number; failed: number }> {
    this.logger.log(`Starting daily settlements for ${day.toISOString()}`);
    let cursor: string | undefined;
    let outlets = 0;
    let failed = 0;

    for (;;) {
      const batch = await this.prisma.outlet.findMany({
        where: { isActive: true },
        select: { id: true, businessId: true },
        orderBy: { id: 'asc' },
        take: OUTLET_BATCH,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (batch.length === 0) break;

      for (const outlet of batch) {
        outlets++;
        try {
          const results = await this.autoSettlementUseCase.execute({
            outletId: outlet.id,
            businessId: outlet.businessId,
            settlementDate: day,
          });
          this.logger.log(`Settlement for outlet ${outlet.id}: ${results.length} payment methods`);
        } catch (error) {
          failed++;
          const err = error instanceof Error ? error : new Error(String(error));
          // Other outlets still settle; the next run (idempotent) retries this one.
          this.logger.error(`Settlement failed for outlet ${outlet.id}: ${err.message}`, err.stack);
        }
      }
      cursor = batch[batch.length - 1].id;
      if (batch.length < OUTLET_BATCH) break;
    }

    this.logger.log(`Daily settlements done: ${outlets} outlets, ${failed} failed`);
    return { outlets, failed };
  }
}
