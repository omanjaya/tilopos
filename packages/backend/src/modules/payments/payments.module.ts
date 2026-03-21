import { Module } from '@nestjs/common';
import { PaymentsWebhookController } from './payments.controller';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaymentModule } from '../../infrastructure/services/payment/payment.module';
import { HandleMidtransWebhookUseCase } from '../../application/use-cases/payments/handle-midtrans-webhook.use-case';
import { HandleXenditWebhookUseCase } from '../../application/use-cases/payments/handle-xendit-webhook.use-case';
import { PaymentGatewayService, EDCGateway, CashGateway } from './payment-gateway.service';

@Module({
  imports: [PaymentModule],
  controllers: [PaymentsWebhookController],
  providers: [
    // Infrastructure
    PrismaService,

    // Internal Payment Gateways
    EDCGateway,
    CashGateway,

    // Aggregator Service
    PaymentGatewayService,

    // Use Cases
    HandleMidtransWebhookUseCase,
    HandleXenditWebhookUseCase,
  ],
  exports: [
    // Re-export PaymentModule so consumers get access to the gateway token and factory
    PaymentModule,

    // Internal gateways
    EDCGateway,
    CashGateway,

    // Services
    PaymentGatewayService,

    // Use Cases
    HandleMidtransWebhookUseCase,
    HandleXenditWebhookUseCase,
  ],
})
export class PaymentsModule {}
