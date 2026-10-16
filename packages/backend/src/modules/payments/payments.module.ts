import { Module } from '@nestjs/common';
import { PaymentsWebhookController } from './payments.controller';
import { PaymentModule } from '../../infrastructure/services/payment/payment.module';
import { HandleMidtransWebhookUseCase } from '../../application/use-cases/payments/handle-midtrans-webhook.use-case';
import { HandleXenditWebhookUseCase } from '../../application/use-cases/payments/handle-xendit-webhook.use-case';
import { PaymentWebhookProcessor } from '../../application/use-cases/payments/payment-webhook.processor';

/**
 * Payment gateway webhooks. PrismaService comes from the global DatabaseModule
 * (not re-provided here, which would open a second connection pool).
 */
@Module({
  imports: [PaymentModule],
  controllers: [PaymentsWebhookController],
  providers: [PaymentWebhookProcessor, HandleMidtransWebhookUseCase, HandleXenditWebhookUseCase],
  exports: [
    // Re-export PaymentModule so consumers get access to the gateway token and factory
    PaymentModule,
    HandleMidtransWebhookUseCase,
    HandleXenditWebhookUseCase,
  ],
})
export class PaymentsModule {}
