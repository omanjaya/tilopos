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
import { HeldBillStore } from '../../infrastructure/cache/held-bill.store';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { SERVICE_TOKENS } from '../../infrastructure/services/service.tokens';
import { PrismaTransactionRepository } from '../../infrastructure/repositories/prisma-transaction.repository';
import { PrismaProductRepository } from '../../infrastructure/repositories/prisma-product.repository';
import { PrismaInventoryRepository } from '../../infrastructure/repositories/prisma-inventory.repository';
import { PrismaShiftRepository } from '../../infrastructure/repositories/prisma-shift.repository';
import { PrismaCustomerRepository } from '../../infrastructure/repositories/prisma-customer.repository';
import { PrismaAuditRepository } from '../../infrastructure/repositories/prisma-audit.repository';
import { MockPaymentGateway } from '../../infrastructure/services/mock-payment-gateway';

@Module({
  controllers: [PosController],
  providers: [
    CreateTransactionUseCase,
    ProcessRefundUseCase,
    ProcessMultiPaymentUseCase,
    VoidTransactionUseCase,
    CashInUseCase,
    CashOutUseCase,
    HoldBillUseCase,
    ListHeldBillsUseCase,
    ResumeBillUseCase,
    ReprintReceiptUseCase,
    HeldBillStore,
    { provide: REPOSITORY_TOKENS.TRANSACTION, useClass: PrismaTransactionRepository },
    { provide: REPOSITORY_TOKENS.PRODUCT, useClass: PrismaProductRepository },
    { provide: REPOSITORY_TOKENS.INVENTORY, useClass: PrismaInventoryRepository },
    { provide: REPOSITORY_TOKENS.SHIFT, useClass: PrismaShiftRepository },
    { provide: REPOSITORY_TOKENS.CUSTOMER, useClass: PrismaCustomerRepository },
    { provide: REPOSITORY_TOKENS.AUDIT, useClass: PrismaAuditRepository },
    { provide: SERVICE_TOKENS.PAYMENT_GATEWAY, useClass: MockPaymentGateway },
  ],
})
export class PosModule {}
