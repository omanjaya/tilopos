import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SelfOrderController } from './self-order.controller';
import { CreateSelfOrderSessionUseCase } from '../../application/use-cases/self-order/create-session.use-case';
import { SelfOrderPaymentService } from './self-order-payment.service';
import { SelfOrderScheduler } from './self-order.scheduler';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [SelfOrderController],
  providers: [
    CreateSelfOrderSessionUseCase,
    SelfOrderPaymentService,
    SelfOrderScheduler,
    PrismaService,
  ],
  exports: [SelfOrderPaymentService, SelfOrderScheduler],
})
export class SelfOrderModule {}
