import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaPromotionRepository } from '../../infrastructure/repositories/prisma-promotion.repository';
import { PrismaService } from '../../infrastructure/database/prisma.service';

// Use Cases - Promotion Rules
import { ApplyPromotionUseCase } from '../../application/use-cases/promotions/apply-promotion.use-case';
import { ValidateVoucherUseCase } from '../../application/use-cases/promotions/validate-voucher.use-case';
import { GenerateVoucherBatchUseCase } from '../../application/use-cases/promotions/generate-voucher-batch.use-case';

// Services - Rules Engine
import { PromotionRulesEngine } from '../../application/services/promotion-rules.engine';

@Module({
  controllers: [PromotionsController],
  providers: [
    // Repositories
    { provide: REPOSITORY_TOKENS.PROMOTION, useClass: PrismaPromotionRepository },

    // Services
    PrismaService,
    PromotionRulesEngine,

    // Use Cases
    ApplyPromotionUseCase,
    ValidateVoucherUseCase,
    GenerateVoucherBatchUseCase,
  ],
  exports: [
    ApplyPromotionUseCase,
    ValidateVoucherUseCase,
    GenerateVoucherBatchUseCase,
    PromotionRulesEngine,
  ],
})
export class PromotionsModule {}
