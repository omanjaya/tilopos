import { Module } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaCreditSaleRepository } from '../../infrastructure/repositories/prisma-credit-sale.repository';
import { PrismaProductRepository } from '../../infrastructure/repositories/prisma-product.repository';
import { PrismaInventoryRepository } from '../../infrastructure/repositories/prisma-inventory.repository';
import { PrismaShiftRepository } from '../../infrastructure/repositories/prisma-shift.repository';
import { CreateCreditTransactionUseCase } from '../../application/use-cases/credit/create-credit-transaction.use-case';
import { RecordCreditPaymentUseCase } from '../../application/use-cases/credit/record-credit-payment.use-case';
import { CreditController } from './credit.controller';

@Module({
  controllers: [CreditController],
  providers: [
    {
      provide: REPOSITORY_TOKENS.CREDIT_SALE,
      useClass: PrismaCreditSaleRepository,
    },
    {
      provide: REPOSITORY_TOKENS.PRODUCT,
      useClass: PrismaProductRepository,
    },
    {
      provide: REPOSITORY_TOKENS.INVENTORY,
      useClass: PrismaInventoryRepository,
    },
    {
      provide: REPOSITORY_TOKENS.SHIFT,
      useClass: PrismaShiftRepository,
    },
    CreateCreditTransactionUseCase,
    RecordCreditPaymentUseCase,
  ],
  exports: [REPOSITORY_TOKENS.CREDIT_SALE],
})
export class CreditModule {}
