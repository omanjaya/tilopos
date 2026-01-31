import { Injectable } from '@nestjs/common';
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
  async processPayment(_input: PaymentInput): Promise<PaymentResult> {
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
