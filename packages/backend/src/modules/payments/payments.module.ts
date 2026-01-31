import { Module } from '@nestjs/common';
import { PaymentsWebhookController } from './payments.controller';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MidtransGateway } from '../../infrastructure/services/payment/midtrans-gateway';
import { XenditGateway } from '../../infrastructure/services/payment/xendit-gateway';
import { MockPaymentGateway } from '../../infrastructure/services/mock-payment-gateway';
import { PaymentGatewayFactory } from '../../infrastructure/services/payment/payment-gateway.factory';
import { HandleMidtransWebhookUseCase } from '../../application/use-cases/payments/handle-midtrans-webhook.use-case';
import { HandleXenditWebhookUseCase } from '../../application/use-cases/payments/handle-xendit-webhook.use-case';
import { PaymentGatewayService, EDCGateway, CashGateway } from './payment-gateway.service';

@Module({
  controllers: [PaymentsWebhookController],
  providers: [
    // Infrastructure
    PrismaService,

    // External Payment Gateways
    MidtransGateway,
    XenditGateway,
    MockPaymentGateway,
    PaymentGatewayFactory,

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
    // Gateways
    MidtransGateway,
    XenditGateway,
    MockPaymentGateway,
    PaymentGatewayFactory,
    EDCGateway,
    CashGateway,

    // Services
    PaymentGatewayService,

    // Use Cases
    HandleMidtransWebhookUseCase,
    HandleXenditWebhookUseCase,
  ],
})
export class PaymentsModule { }
