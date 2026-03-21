import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MidtransGateway } from './midtrans-gateway';
import { XenditGateway } from './xendit/xendit-gateway';
import { MockPaymentGateway } from '../mock-payment-gateway';
import type { IPaymentGateway } from '@domain/interfaces/services';
import { AppError, ErrorCode } from '../../../shared/errors/app-error';

@Injectable()
export class PaymentGatewayFactory {
  private readonly logger = new Logger(PaymentGatewayFactory.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly midtrans: MidtransGateway,
    private readonly xendit: XenditGateway,
    private readonly mock: MockPaymentGateway,
  ) {}

  getGateway(provider?: string): IPaymentGateway {
    const gateway = provider || this.configService.get<string>('PAYMENT_GATEWAY', 'xendit');
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const isProduction = nodeEnv === 'production';

    switch (gateway) {
      case 'midtrans': {
        const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY', '');
        if (!serverKey) {
          return this.fallbackToMock(isProduction, 'Midtrans (MIDTRANS_SERVER_KEY not configured)');
        }
        return this.midtrans;
      }
      case 'xendit': {
        const apiKey = this.configService.get<string>('XENDIT_API_KEY', '');
        if (!apiKey) {
          return this.fallbackToMock(isProduction, 'Xendit (XENDIT_API_KEY not configured)');
        }
        return this.xendit;
      }
      case 'mock':
        if (isProduction) {
          throw new AppError(
            ErrorCode.CONFIGURATION_ERROR,
            'Mock payment gateway cannot be explicitly selected in production. Set PAYMENT_GATEWAY to midtrans or xendit.',
          );
        }
        return this.mock;
      default:
        throw new AppError(
          ErrorCode.CONFIGURATION_ERROR,
          `Unknown payment gateway: ${gateway}. Valid options: midtrans, xendit, mock`,
        );
    }
  }

  private fallbackToMock(isProduction: boolean, reason: string): IPaymentGateway {
    if (isProduction) {
      this.logger.error(
        `CRITICAL: No real payment gateway configured — ${reason}. ` +
          'Falling back to MockPaymentGateway in PRODUCTION. ' +
          'All payments will return fake success responses. ' +
          'Configure a real payment provider immediately.',
      );
    } else {
      this.logger.warn(
        `No real payment gateway configured — ${reason}. Using MockPaymentGateway for development/test.`,
      );
    }
    return this.mock;
  }
}
