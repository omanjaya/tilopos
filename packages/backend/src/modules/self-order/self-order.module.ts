import { Module } from '@nestjs/common';
import { SelfOrderController } from './self-order.controller';
import { CreateSelfOrderSessionUseCase } from '../../application/use-cases/self-order/create-session.use-case';
import { SelfOrderPaymentService } from './self-order-payment.service';
import { SelfOrderScheduler } from './self-order.scheduler';
import { SelfOrderSessionService } from './self-order-session.service';

// PrismaService, DocumentNumberService and DistributedLockService come from global modules.
@Module({
  controllers: [SelfOrderController],
  providers: [
    CreateSelfOrderSessionUseCase,
    SelfOrderSessionService,
    SelfOrderPaymentService,
    SelfOrderScheduler,
  ],
  exports: [SelfOrderPaymentService, SelfOrderScheduler],
})
export class SelfOrderModule {}
