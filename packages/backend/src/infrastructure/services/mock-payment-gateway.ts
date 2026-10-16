import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  IPaymentGateway,
  PaymentInput,
  PaymentResult,
  RefundResult,
  PaymentStatus,
} from '@domain/interfaces/services';

/**
 * Development/test stand-in for a real gateway. PaymentGatewayFactory only
 * returns it when NODE_ENV is 'development' or 'test'; every call also refuses
 * to run in production as a second line of defence (R10).
 *
 * Outside production it simulates an instantly confirmed charge
 * (`paymentData.paymentStatus: 'completed'`, flagged `mock: true`).
 */
@Injectable()
export class MockPaymentGateway implements IPaymentGateway {
  private readonly logger = new Logger(MockPaymentGateway.name);

  async processPayment(input: PaymentInput): Promise<PaymentResult> {
    this.assertNotProduction();
    this.logger.warn(`MockPaymentGateway.processPayment (${input.method}, ${input.amount})`);
    return {
      success: true,
      transactionRef: `mock:${randomUUID()}`,
      message: 'Mock payment confirmed (development/test only)',
      paymentData: { paymentStatus: 'completed', mock: true },
    };
  }

  async refundPayment(_transactionRef: string, _amount: number): Promise<RefundResult> {
    this.assertNotProduction();
    return {
      success: true,
      refundRef: `mock:${randomUUID()}`,
      message: 'Mock refund processed',
    };
  }

  async checkStatus(_transactionRef: string): Promise<PaymentStatus> {
    this.assertNotProduction();
    return 'completed';
  }

  private assertNotProduction(): void {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MockPaymentGateway must never be used in production');
    }
  }
}
