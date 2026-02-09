import { Module } from '@nestjs/common';
import { PricingController } from './pricing.controller';
import { CalculateDynamicPriceUseCase } from '../../application/use-cases/pricing/calculate-dynamic-price.use-case';
import { PricingCalculatorService } from '../../domain/services/pricing-calculator.service';
import { PrismaPricingRuleRepository } from '../../infrastructure/repositories/prisma-pricing-rule.repository';

@Module({
  controllers: [PricingController],
  providers: [
    CalculateDynamicPriceUseCase,
    PricingCalculatorService,
    {
      provide: 'IPricingRuleRepository',
      useClass: PrismaPricingRuleRepository,
    },
    PrismaPricingRuleRepository,
  ],
  exports: [
    CalculateDynamicPriceUseCase,
    PricingCalculatorService,
    PrismaPricingRuleRepository,
  ],
})
export class PricingModule {}
