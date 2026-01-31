import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { TransactionNotFoundException } from '@domain/exceptions/transaction-not-found.exception';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import type { ITransactionRepository } from '@domain/interfaces/repositories/transaction.repository';

export interface SplitBillInput {
  transactionId: string;
  splitType: 'equal' | 'by_item' | 'by_amount';
  splits: {
    customerName?: string;
    itemIds?: string[];
    amount?: number;
    paymentMethod: string;
  }[];
}

export interface SplitBillOutput {
  parentTransactionId: string;
  childTransactions: {
    transactionId: string;
    receiptNumber: string;
    amount: number;
  }[];
}

@Injectable()
export class SplitBillUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.TRANSACTION)
    private readonly transactionRepo: ITransactionRepository,
  ) {}

  async execute(input: SplitBillInput): Promise<SplitBillOutput> {
    const transaction = await this.transactionRepo.findById(input.transactionId);
    if (!transaction) {
      throw new TransactionNotFoundException(input.transactionId);
    }

    const childTransactions: SplitBillOutput['childTransactions'] = [];
    const splitCount = input.splits.length;

    for (let i = 0; i < splitCount; i++) {
      const split = input.splits[i];
      let amount: number;

      if (input.splitType === 'equal') {
        amount = Math.round(transaction.grandTotal / splitCount);
      } else if (input.splitType === 'by_amount' && split.amount !== undefined) {
        amount = split.amount;
      } else {
        amount = Math.round(transaction.grandTotal / splitCount);
      }

      const receiptNumber = `SPL-${Date.now()}-${i + 1}`;

      const childTx = await this.transactionRepo.save({
        id: '',
        outletId: transaction.outletId,
        employeeId: transaction.employeeId,
        customerId: null,
        shiftId: transaction.shiftId,
        receiptNumber,
        transactionType: 'sale',
        orderType: transaction.orderType,
        tableId: transaction.tableId,
        subtotal: amount,
        discountAmount: 0,
        taxAmount: 0,
        serviceCharge: 0,
        grandTotal: amount,
        notes: `Split ${i + 1} of ${splitCount} from ${transaction.receiptNumber}`,
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      childTransactions.push({
        transactionId: childTx.id,
        receiptNumber,
        amount,
      });
    }

    const totalSplit = childTransactions.reduce((sum, c) => sum + c.amount, 0);
    if (totalSplit < transaction.grandTotal) {
      throw new BusinessError(ErrorCode.INVALID_PAYMENT, 'Split amounts do not cover the total');
    }

    return {
      parentTransactionId: input.transactionId,
      childTransactions,
    };
  }
}
