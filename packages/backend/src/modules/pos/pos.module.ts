import { Module } from '@nestjs/common';
import { PosController } from './pos.controller';
import { CreateTransactionUseCase } from '../../application/use-cases/pos/create-transaction.use-case';
import { ProcessRefundUseCase } from '../../application/use-cases/pos/process-refund.use-case';
import { ProcessMultiPaymentUseCase } from '../../application/use-cases/billing/process-multi-payment.use-case';
import { VoidTransactionUseCase } from '../../application/use-cases/pos/void-transaction.use-case';
import { CashInUseCase } from '../../application/use-cases/pos/cash-in.use-case';
import { CashOutUseCase } from '../../application/use-cases/pos/cash-out.use-case';
import { HoldBillUseCase } from '../../application/use-cases/pos/hold-bill.use-case';
import { ListHeldBillsUseCase } from '../../application/use-cases/pos/list-held-bills.use-case';
import { ResumeBillUseCase } from '../../application/use-cases/pos/resume-bill.use-case';
import { ReprintReceiptUseCase } from '../../application/use-cases/pos/reprint-receipt.use-case';
import { TransactionQueriesUseCase } from '../../application/use-cases/pos/transaction-queries.use-case';
import {
  SalePricingService,
  PRICING_RULE_REPOSITORY,
} from '../../application/services/sale-pricing.service';
import { PromotionRulesEngine } from '../../application/services/promotion-rules.engine';
import { PricingCalculatorService } from '../../domain/services/pricing-calculator.service';
import { PrismaPricingRuleRepository } from '../../infrastructure/repositories/prisma-pricing-rule.repository';
import { HeldBillStore } from '../../infrastructure/cache/held-bill.store';
import { PaymentModule } from '../../infrastructure/services/payment/payment.module';
import { TaxConfigurationRepository } from '../../infrastructure/repositories/settings/tax-configuration.repository';
import { BusinessModule } from '../business/business.module';

@Module({
  imports: [PaymentModule, BusinessModule],
  controllers: [PosController],
  providers: [
    CreateTransactionUseCase,
    TaxConfigurationRepository,
    ProcessRefundUseCase,
    ProcessMultiPaymentUseCase,
    VoidTransactionUseCase,
    CashInUseCase,
    CashOutUseCase,
    HoldBillUseCase,
    ListHeldBillsUseCase,
    ResumeBillUseCase,
    ReprintReceiptUseCase,
    TransactionQueriesUseCase,
    HeldBillStore,
    // Server-side sale pricing (R8)
    SalePricingService,
    PromotionRulesEngine,
    PricingCalculatorService,
    { provide: PRICING_RULE_REPOSITORY, useClass: PrismaPricingRuleRepository },
  ],
})
export class PosModule {}
