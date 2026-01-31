import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { SERVICE_TOKENS } from '@infrastructure/services/service.tokens';
import { TransactionNotFoundException } from '@domain/exceptions/transaction-not-found.exception';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import type { ITransactionRepository } from '@domain/interfaces/repositories/transaction.repository';
import type { IPaymentGateway } from '@domain/interfaces/services/payment-gateway';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface MultiPaymentInput {
  transactionId: string;
  payments: {
    method: string;
    amount: number;
    referenceNumber?: string;
  }[];
}

export interface MultiPaymentOutput {
  transactionId: string;
  totalPaid: number;
  change: number;
  paymentRecords: {
    paymentId: string;
    method: string;
    amount: number;
  }[];
}

@Injectable()
export class ProcessMultiPaymentUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.TRANSACTION)
    private readonly transactionRepo: ITransactionRepository,
    @Inject(SERVICE_TOKENS.PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: MultiPaymentInput): Promise<MultiPaymentOutput> {
    const transaction = await this.transactionRepo.findById(input.transactionId);
    if (!transaction) {
      throw new TransactionNotFoundException(input.transactionId);
    }

    const totalPayments = input.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPayments < transaction.grandTotal) {
      throw new BusinessError(
        ErrorCode.INVALID_PAYMENT,
        `Total payments ${totalPayments} is less than grand total ${transaction.grandTotal}`,
      );
    }

    const paymentRecords: { paymentId: string; method: string; amount: number }[] = [];

    for (const payment of input.payments) {
      if (payment.method !== 'cash') {
        await this.paymentGateway.processPayment({
          method: payment.method,
          amount: payment.amount,
          referenceNumber: payment.referenceNumber,
        });
      }

      const record = await this.prisma.payment.create({
        data: {
          transactionId: input.transactionId,
          paymentMethod: payment.method as 'cash' | 'card' | 'gopay' | 'ovo' | 'dana' | 'shopeepay' | 'qris' | 'bank_transfer' | 'credit_note',
          amount: payment.amount,
          referenceNumber: payment.referenceNumber || null,
          status: 'completed',
        },
      });

      paymentRecords.push({
        paymentId: record.id,
        method: payment.method,
        amount: payment.amount,
      });
    }

    let cashChange = 0;
    const cashPayment = input.payments.find(p => p.method === 'cash');
    if (cashPayment) {
      const nonCashTotal = input.payments
        .filter(p => p.method !== 'cash')
        .reduce((sum, p) => sum + p.amount, 0);
      const cashNeeded = transaction.grandTotal - nonCashTotal;
      cashChange = Math.max(0, cashPayment.amount - cashNeeded);
    }

    await this.transactionRepo.update(input.transactionId, { status: 'completed' });

    return {
      transactionId: input.transactionId,
      totalPaid: totalPayments,
      change: cashChange,
      paymentRecords,
    };
  }
}
