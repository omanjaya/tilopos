import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type { PaymentMethod } from '@prisma/client';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';

export interface RecordCreditPaymentInput {
  creditSaleId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  receivedBy: string;
}

export interface RecordCreditPaymentOutput {
  paymentId: string;
  newPaidAmount: number;
  newOutstandingAmount: number;
  isSettled: boolean;
}

@Injectable()
export class RecordCreditPaymentUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: RecordCreditPaymentInput): Promise<RecordCreditPaymentOutput> {
    const creditSale = await this.prisma.creditSale.findUnique({
      where: { id: input.creditSaleId },
    });

    if (!creditSale) {
      throw new BusinessError(ErrorCode.CREDIT_SALE_NOT_FOUND, 'Credit sale not found');
    }

    if (creditSale.status === 'settled') {
      throw new BusinessError(ErrorCode.CREDIT_ALREADY_SETTLED, 'Credit sale is already settled');
    }

    const outstanding = Number(creditSale.outstandingAmount);
    if (input.amount > outstanding) {
      throw new BusinessError(
        ErrorCode.CREDIT_PAYMENT_EXCEEDS_OUTSTANDING,
        `Payment amount ${input.amount} exceeds outstanding ${outstanding}`,
      );
    }

    const newPaidAmount = Number(creditSale.paidAmount) + input.amount;
    const newOutstandingAmount = Number(creditSale.totalAmount) - newPaidAmount;
    const isSettled = newOutstandingAmount <= 0;
    const paymentId = crypto.randomUUID();

    await this.prisma.$transaction(async (tx) => {
      // 1. Create credit payment record
      await tx.creditPayment.create({
        data: {
          id: paymentId,
          creditSaleId: input.creditSaleId,
          amount: input.amount,
          paymentMethod: input.paymentMethod as PaymentMethod,
          referenceNumber: input.referenceNumber || null,
          notes: input.notes || null,
          receivedBy: input.receivedBy,
        },
      });

      // 2. Update credit sale amounts and status
      await tx.creditSale.update({
        where: { id: input.creditSaleId },
        data: {
          paidAmount: newPaidAmount,
          outstandingAmount: Math.max(0, newOutstandingAmount),
          status: isSettled ? 'settled' : 'partially_paid',
        },
      });

      // 3. Update transaction status if fully settled
      if (isSettled) {
        await tx.transaction.update({
          where: { id: creditSale.transactionId },
          data: { status: 'completed' },
        });
      }

      // 4. Decrease customer credit balance
      await tx.customer.update({
        where: { id: creditSale.customerId },
        data: { creditBalance: { decrement: input.amount } },
      });
    });

    return {
      paymentId,
      newPaidAmount,
      newOutstandingAmount: Math.max(0, newOutstandingAmount),
      isSettled,
    };
  }
}
