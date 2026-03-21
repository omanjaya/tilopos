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

    if (transaction.status !== 'completed') {
      throw new BusinessError(
        ErrorCode.INVALID_TRANSACTION,
        'Only completed transactions can be split',
      );
    }

    const splitCount = input.splits.length;
    if (splitCount < 2) {
      throw new BusinessError(ErrorCode.INVALID_TRANSACTION, 'Must split into at least 2 parts');
    }

    // Pre-calculate all split amounts and validate BEFORE writing to DB
    const splitData: Array<{ amount: number; receiptNumber: string }> = [];
    for (let i = 0; i < splitCount; i++) {
      const split = input.splits[i];
      let amount: number;

      if (input.splitType === 'equal') {
        const baseAmount = Math.floor(transaction.grandTotal / splitCount);
        const remainder = transaction.grandTotal - baseAmount * splitCount;
        // First split gets the remainder to ensure exact total
        amount = i === 0 ? baseAmount + remainder : baseAmount;
      } else if (input.splitType === 'by_amount' && split.amount !== undefined) {
        amount = split.amount;
      } else {
        const baseAmount = Math.floor(transaction.grandTotal / splitCount);
        const remainder = transaction.grandTotal - baseAmount * splitCount;
        amount = i === 0 ? baseAmount + remainder : baseAmount;
      }

      splitData.push({ amount, receiptNumber: `SPL-${Date.now()}-${i + 1}` });
    }

    const totalSplit = splitData.reduce((sum, s) => sum + s.amount, 0);
    if (totalSplit < transaction.grandTotal) {
      throw new BusinessError(ErrorCode.INVALID_PAYMENT, 'Split amounts do not cover the total');
    }

    // All validations passed — now create child transactions
    const childTransactions: SplitBillOutput['childTransactions'] = [];
    for (const data of splitData) {
      const childTx = await this.transactionRepo.save({
        id: '',
        businessId: transaction.businessId,
        outletId: transaction.outletId,
        employeeId: transaction.employeeId,
        customerId: null,
        shiftId: transaction.shiftId,
        receiptNumber: data.receiptNumber,
        transactionType: 'sale',
        orderType: transaction.orderType,
        tableId: transaction.tableId,
        subtotal: data.amount,
        discountAmount: 0,
        taxAmount: 0,
        serviceCharge: 0,
        grandTotal: data.amount,
        notes: `Split from ${transaction.receiptNumber}`,
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      childTransactions.push({
        transactionId: childTx.id,
        receiptNumber: data.receiptNumber,
        amount: data.amount,
      });
    }

    // Mark parent as split to prevent double-splitting
    await this.transactionRepo.update(input.transactionId, { status: 'split' });

    return {
      parentTransactionId: input.transactionId,
      childTransactions,
    };
  }
}
