import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MidtransGateway } from './midtrans-gateway';
import { XenditGateway } from './xendit/xendit-gateway';
import { MockPaymentGateway } from '../mock-payment-gateway';
import type { IPaymentGateway } from '@domain/interfaces/services';

@Injectable()
export class PaymentGatewayFactory {
  constructor(
    private readonly configService: ConfigService,
    private readonly midtrans: MidtransGateway,
    private readonly xendit: XenditGateway,
    private readonly mock: MockPaymentGateway,
  ) {}

  getGateway(provider?: string): IPaymentGateway {
    const gateway = provider || this.configService.get<string>('PAYMENT_GATEWAY', 'xendit');
    switch (gateway) {
      case 'midtrans':
        return this.midtrans;
      case 'xendit':
        return this.xendit;
      case 'mock':
        if (this.configService.get<string>('NODE_ENV') === 'production') {
          throw new Error(
            'Mock payment gateway cannot be used in production. Set PAYMENT_GATEWAY to midtrans or xendit.',
          );
        }
        return this.mock;
      default:
        throw new Error(
          `Unknown payment gateway: ${gateway}. Valid options: midtrans, xendit, mock`,
        );
    }
  }
}
