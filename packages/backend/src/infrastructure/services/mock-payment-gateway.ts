import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  IPaymentGateway,
  PaymentInput,
  PaymentResult,
  RefundResult,
  PaymentStatus,
} from '@domain/interfaces/services';

@Injectable()
export class MockPaymentGateway implements IPaymentGateway {
  private readonly logger = new Logger(MockPaymentGateway.name);

  constructor() {
    this.logger.warn('MockPaymentGateway is active — DO NOT use in production');
  }

  async processPayment(_input: PaymentInput): Promise<PaymentResult> {
    this.logger.warn(
      `MockPaymentGateway.processPayment called — returning fake success for amount ${_input.amount}`,
    );
    return {
      success: true,
      transactionRef: randomUUID(),
      message: 'Mock payment processed successfully',
    };
  }

  async refundPayment(_transactionRef: string, _amount: number): Promise<RefundResult> {
    return {
      success: true,
      refundRef: randomUUID(),
      message: 'Mock refund processed successfully',
    };
  }

  async checkStatus(_transactionRef: string): Promise<PaymentStatus> {
    return 'completed';
  }
}
