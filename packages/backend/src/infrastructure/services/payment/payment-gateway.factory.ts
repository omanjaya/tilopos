import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MidtransGateway } from './midtrans-gateway';
import { XenditGateway } from './xendit/xendit-gateway';
import { MockPaymentGateway } from '../mock-payment-gateway';
import type { IPaymentGateway } from '@domain/interfaces/services';
import { AppError, ErrorCode } from '../../../shared/errors/app-error';

/** Environments where the always-succeeding mock gateway may be used. */
const MOCK_ALLOWED_ENVS = new Set(['development', 'test']);

/**
 * Selects the payment gateway (Docs/ENGINEERING-RULES.md R10/R16).
 *
 * The mock gateway is only ever returned when NODE_ENV is explicitly
 * 'development' or 'test'. Anywhere else (production, staging, or NODE_ENV
 * unset) a missing/unknown configuration throws, so the app refuses to boot
 * instead of faking successful charges.
 */
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
    const nodeEnv = this.configService.get<string>('NODE_ENV') ?? '';
    const mockAllowed = MOCK_ALLOWED_ENVS.has(nodeEnv);
    const gateway = provider || this.configService.get<string>('PAYMENT_GATEWAY') || 'xendit';

    switch (gateway) {
      case 'midtrans':
        if (!this.configService.get<string>('MIDTRANS_SERVER_KEY')) {
          return this.mockOrThrow(mockAllowed, nodeEnv, 'MIDTRANS_SERVER_KEY is not configured');
        }
        return this.midtrans;
      case 'xendit':
        if (!this.configService.get<string>('XENDIT_API_KEY')) {
          return this.mockOrThrow(mockAllowed, nodeEnv, 'XENDIT_API_KEY is not configured');
        }
        return this.xendit;
      case 'mock':
        return this.mockOrThrow(mockAllowed, nodeEnv, 'PAYMENT_GATEWAY=mock was selected');
      default:
        throw new AppError(
          ErrorCode.CONFIGURATION_ERROR,
          `Unknown payment gateway: ${gateway}. Valid options: midtrans, xendit, mock`,
        );
    }
  }

  private mockOrThrow(mockAllowed: boolean, nodeEnv: string, reason: string): IPaymentGateway {
    if (!mockAllowed) {
      throw new AppError(
        ErrorCode.CONFIGURATION_ERROR,
        `No real payment gateway available (${reason}) and the mock gateway is not allowed ` +
          `for NODE_ENV="${nodeEnv || 'unset'}". Configure midtrans or xendit.`,
      );
    }
    this.logger.warn(`${reason}; using MockPaymentGateway (NODE_ENV=${nodeEnv})`);
    return this.mock;
  }
}
