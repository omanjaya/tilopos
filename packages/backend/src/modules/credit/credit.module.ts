import { Module } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaCreditSaleRepository } from '../../infrastructure/repositories/prisma-credit-sale.repository';
import { PrismaPricingRuleRepository } from '../../infrastructure/repositories/prisma-pricing-rule.repository';
import { CreateCreditTransactionUseCase } from '../../application/use-cases/credit/create-credit-transaction.use-case';
import { RecordCreditPaymentUseCase } from '../../application/use-cases/credit/record-credit-payment.use-case';
import {
  SalePricingService,
  PRICING_RULE_REPOSITORY,
} from '../../application/services/sale-pricing.service';
import { PromotionRulesEngine } from '../../application/services/promotion-rules.engine';
import { PricingCalculatorService } from '../../domain/services/pricing-calculator.service';
import { CreditController } from './credit.controller';
import { TaxConfigurationRepository } from '../../infrastructure/repositories/settings/tax-configuration.repository';
import { BusinessModule } from '../business/business.module';

@Module({
  imports: [BusinessModule],
  controllers: [CreditController],
  providers: [
    TaxConfigurationRepository,
    PrismaCreditSaleRepository,
    { provide: REPOSITORY_TOKENS.CREDIT_SALE, useExisting: PrismaCreditSaleRepository },
    SalePricingService,
    PromotionRulesEngine,
    PricingCalculatorService,
    { provide: PRICING_RULE_REPOSITORY, useClass: PrismaPricingRuleRepository },
    CreateCreditTransactionUseCase,
    RecordCreditPaymentUseCase,
  ],
  exports: [REPOSITORY_TOKENS.CREDIT_SALE, PrismaCreditSaleRepository],
})
export class CreditModule {}
