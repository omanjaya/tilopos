import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AutoSettlementUseCase } from '../../application/use-cases/settlements/auto-settlement.use-case';

@Injectable()
export class SettlementSchedulerService {
  private readonly logger = new Logger(SettlementSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly autoSettlementUseCase: AutoSettlementUseCase,
  ) {}

  // Run every day at midnight (00:00)
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scheduleDailySettlements(): Promise<void> {
    this.logger.log('Starting daily settlement scheduling...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Get all active outlets
    const outlets = await this.prisma.outlet.findMany({
      where: { isActive: true },
      select: { id: true, businessId: true },
    });

    for (const outlet of outlets) {
      try {
        const results = await this.autoSettlementUseCase.execute({
          outletId: outlet.id,
          businessId: outlet.businessId,
          settlementDate: yesterday,
        });

        this.logger.log(
          `Settlement scheduled for outlet ${outlet.id}: ${results.length} payment methods`,
        );
      } catch (error) {
        this.logger.error(`Failed to schedule settlement for outlet ${outlet.id}: ${error}`);
      }
    }

    this.logger.log('Daily settlement scheduling completed');
  }

  // Manual trigger for specific outlet
  async triggerOutletSettlement(outletId: string, businessId: string): Promise<void> {
    this.logger.log(`Triggering settlement for outlet ${outletId}`);

    try {
      const results = await this.autoSettlementUseCase.execute({
        outletId,
        businessId,
      });

      this.logger.log(
        `Settlement completed for outlet ${outletId}: ${results.length} payment methods`,
      );
    } catch (error) {
      this.logger.error(`Settlement failed for outlet ${outletId}: ${error}`);
      throw error;
    }
  }
}
