import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaPromotionRepository } from '../../infrastructure/repositories/prisma-promotion.repository';

// Use Cases - Promotion Rules
import { ApplyPromotionUseCase } from '../../application/use-cases/promotions/apply-promotion.use-case';
import { ValidateVoucherUseCase } from '../../application/use-cases/promotions/validate-voucher.use-case';
import { GenerateVoucherBatchUseCase } from '../../application/use-cases/promotions/generate-voucher-batch.use-case';

// Services - Rules Engine
import { PromotionRulesEngine } from '../../application/services/promotion-rules.engine';

// PrismaService comes from the global DatabaseModule, TenantAccessService from the global TenantModule.
@Module({
  controllers: [PromotionsController],
  providers: [
    { provide: REPOSITORY_TOKENS.PROMOTION, useClass: PrismaPromotionRepository },
    PromotionsService,
    PromotionRulesEngine,
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
