import { Module } from '@nestjs/common';
import { MidtransGateway } from './midtrans-gateway';
import { XenditGateway } from './xendit/xendit-gateway';
import { PaymentGatewayFactory } from './payment-gateway.factory';
import { MockPaymentGateway } from '../mock-payment-gateway';
import { SERVICE_TOKENS } from '../service.tokens';

@Module({
  providers: [
    MidtransGateway,
    XenditGateway,
    MockPaymentGateway,
    PaymentGatewayFactory,
    {
      provide: SERVICE_TOKENS.PAYMENT_GATEWAY,
      useFactory: (factory: PaymentGatewayFactory) => factory.getGateway(),
      inject: [PaymentGatewayFactory],
    },
  ],
  exports: [SERVICE_TOKENS.PAYMENT_GATEWAY, PaymentGatewayFactory, MidtransGateway, XenditGateway],
})
export class PaymentModule {}
