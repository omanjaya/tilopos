import { Module } from '@nestjs/common';
import { SettlementsController } from './settlements.controller';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaSettlementRepository } from '../../infrastructure/repositories/prisma-settlement.repository';
import { PrismaService } from '../../infrastructure/database/prisma.service';

// Use Cases - Settlement
import { AutoSettlementUseCase } from '../../application/use-cases/settlements/auto-settlement.use-case';

// Services - Scheduler
import { SettlementSchedulerService } from '../../infrastructure/services/settlement-scheduler.service';

@Module({
  controllers: [SettlementsController],
  providers: [
    // Repositories
    { provide: REPOSITORY_TOKENS.SETTLEMENT, useClass: PrismaSettlementRepository },

    // Services
    PrismaService,

    // Use Cases
    AutoSettlementUseCase,

    // Scheduler
    SettlementSchedulerService,
  ],
  exports: [
    AutoSettlementUseCase,
    SettlementSchedulerService,
  ],
})
export class SettlementsModule {}
