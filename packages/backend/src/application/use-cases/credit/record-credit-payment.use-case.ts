import { Injectable } from '@nestjs/common';
import { Prisma, type PaymentMethod } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import { money, nonNegative } from '@shared/utils/money';

export interface RecordCreditPaymentInput {
  businessId: string;
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

/** Transaction statuses that still carry an unpaid receivable. */
const PAYABLE_TRANSACTION_STATUSES = ['credit', 'partially_paid'];

interface LockedCreditSale {
  id: string;
  transaction_id: string;
  customer_id: string;
  total_amount: Prisma.Decimal;
  paid_amount: Prisma.Decimal;
  outstanding_amount: Prisma.Decimal;
  status: string;
  transaction_status: string;
}

/**
 * Records a repayment on a credit sale. The credit sale row is locked
 * (SELECT ... FOR UPDATE) and all checks and writes happen in the same
 * transaction, so concurrent repayments cannot both pass the outstanding check
 * or overwrite each other's totals (R9).
 *
 * NOTE: repayments are not linked to a shift/cash drawer (CreditPayment has no
 * shift column); see the B2 report.
 */
@Injectable()
export class RecordCreditPaymentUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: RecordCreditPaymentInput): Promise<RecordCreditPaymentOutput> {
    if (input.paymentMethod === 'credit_note') {
      throw new BusinessError(
        ErrorCode.INVALID_PAYMENT,
        'Credit notes cannot be used to repay a credit sale',
      );
    }
    const amount = money(input.amount);
    if (amount.lte(0)) {
      throw new BusinessError(ErrorCode.INVALID_PAYMENT, 'Payment amount must be positive');
    }
    const paymentId = crypto.randomUUID();

    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<LockedCreditSale[]>`
        SELECT cs.id, cs.transaction_id, cs.customer_id, cs.total_amount, cs.paid_amount,
               cs.outstanding_amount, cs.status, t.status::text AS transaction_status
          FROM credit_sales cs
          JOIN outlets o ON o.id = cs.outlet_id
          JOIN transactions t ON t.id = cs.transaction_id
         WHERE cs.id = ${input.creditSaleId}::uuid
           AND o.business_id = ${input.businessId}::uuid
         FOR UPDATE OF cs`;
      const creditSale = rows[0];
      if (!creditSale) {
        throw new BusinessError(ErrorCode.CREDIT_SALE_NOT_FOUND, 'Credit sale not found');
      }
      if (creditSale.status === 'settled') {
        throw new BusinessError(ErrorCode.CREDIT_ALREADY_SETTLED, 'Credit sale is already settled');
      }
      if (!PAYABLE_TRANSACTION_STATUSES.includes(creditSale.transaction_status)) {
        throw new BusinessError(
          ErrorCode.INVALID_TRANSACTION,
          `Cannot record a payment on a ${creditSale.transaction_status} transaction`,
        );
      }

      const outstanding = money(creditSale.outstanding_amount);
      if (amount.gt(outstanding)) {
        throw new BusinessError(
          ErrorCode.CREDIT_PAYMENT_EXCEEDS_OUTSTANDING,
          `Payment amount ${amount.toString()} exceeds outstanding ${outstanding.toString()}`,
        );
      }

      const newPaidAmount = money(creditSale.paid_amount).plus(amount);
      const newOutstanding = nonNegative(money(creditSale.total_amount).minus(newPaidAmount));
      const isSettled = newOutstanding.lte(0);

      await tx.creditPayment.create({
        data: {
          id: paymentId,
          creditSaleId: creditSale.id,
          amount,
          paymentMethod: input.paymentMethod as PaymentMethod,
          referenceNumber: input.referenceNumber || null,
          notes: input.notes || null,
          receivedBy: input.receivedBy,
        },
      });

      await tx.creditSale.update({
        where: { id: creditSale.id },
        data: {
          paidAmount: newPaidAmount,
          outstandingAmount: newOutstanding,
          status: isSettled ? 'settled' : 'partially_paid',
        },
      });

      if (isSettled) {
        const { count } = await tx.transaction.updateMany({
          where: {
            id: creditSale.transaction_id,
            status: { in: ['credit', 'partially_paid'] },
          },
          data: { status: 'completed' },
        });
        if (count !== 1) {
          throw new BusinessError(ErrorCode.CONFLICT, 'Transaction status changed concurrently');
        }
      }

      await tx.customer.updateMany({
        where: { id: creditSale.customer_id, businessId: input.businessId },
        data: { creditBalance: { decrement: amount } },
      });

      return {
        paymentId,
        newPaidAmount: newPaidAmount.toNumber(),
        newOutstandingAmount: newOutstanding.toNumber(),
        isSettled,
      };
    });
  }
}
