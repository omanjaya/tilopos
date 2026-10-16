import { Module } from '@nestjs/common';
import { SettlementsController } from './settlements.controller';
import { SettlementsService } from './settlements.service';
import { AutoSettlementUseCase } from '../../application/use-cases/settlements/auto-settlement.use-case';
import { SettlementSchedulerService } from '../../infrastructure/services/settlement-scheduler.service';

/**
 * PrismaService (DatabaseModule), TenantAccessService and DistributedLockService
 * are global; they are not re-provided here.
 */
@Module({
  controllers: [SettlementsController],
  providers: [SettlementsService, AutoSettlementUseCase, SettlementSchedulerService],
  exports: [AutoSettlementUseCase, SettlementSchedulerService],
})
export class SettlementsModule {}
