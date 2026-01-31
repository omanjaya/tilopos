import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import type { ITransactionRepository, TransactionRecord, TransactionItemRecord } from '@domain/interfaces/repositories/transaction.repository';

export interface SplitByItemsInput {
  splitType: 'by_items';
  transactionId: string;
  employeeId: string;
  splits: Array<{
    itemIds: string[];
    paymentMethod: string;
    paymentAmount: number;
  }>;
}

export interface SplitEvenlyInput {
  splitType: 'evenly';
  transactionId: string;
  employeeId: string;
  numberOfSplits: number;
  payments: Array<{
    paymentMethod: string;
    paymentAmount: number;
  }>;
}

export type SplitBillInput = SplitByItemsInput | SplitEvenlyInput;

export interface SplitBillOutput {
  parentTransactionId: string;
  childTransactions: Array<{
    transactionId: string;
    receiptNumber: string;
    grandTotal: number;
  }>;
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
      throw new BusinessError(ErrorCode.TRANSACTION_NOT_FOUND, 'Transaction not found');
    }

    if (transaction.status !== 'completed') {
      throw new BusinessError(ErrorCode.INVALID_TRANSACTION, 'Only completed transactions can be split');
    }

    const items = await this.transactionRepo.findItemsByTransactionId(input.transactionId);

    if (input.splitType === 'by_items') {
      return this.splitByItems(transaction, items, input);
    }

    return this.splitEvenly(transaction, items, input);
  }

  private async splitByItems(
    transaction: TransactionRecord,
    items: TransactionItemRecord[],
    input: SplitByItemsInput,
  ): Promise<SplitBillOutput> {
    // Validate all item IDs exist in the transaction
    const allItemIds = items.map((i) => i.id);
    const requestedItemIds = input.splits.flatMap((s) => s.itemIds);
    for (const itemId of requestedItemIds) {
      if (!allItemIds.includes(itemId)) {
        throw new BusinessError(ErrorCode.INVALID_TRANSACTION, `Item ${itemId} not found in transaction`);
      }
    }

    // Validate all items are covered
    const coveredItemIds = new Set(requestedItemIds);
    if (coveredItemIds.size !== allItemIds.length) {
      throw new BusinessError(ErrorCode.INVALID_TRANSACTION, 'All items must be assigned to a split');
    }

    const childTransactions: SplitBillOutput['childTransactions'] = [];

    for (let i = 0; i < input.splits.length; i++) {
      const split = input.splits[i];
      const splitItems = items.filter((item) => split.itemIds.includes(item.id));
      const subtotal = splitItems.reduce((sum, item) => sum + item.subtotal, 0);
      const taxRatio = transaction.taxAmount / transaction.subtotal;
      const taxAmount = Math.round(subtotal * taxRatio);
      const grandTotal = subtotal - splitItems.reduce((sum, item) => sum + item.discountAmount, 0) + taxAmount;

      if (split.paymentAmount < grandTotal) {
        throw new BusinessError(ErrorCode.INVALID_PAYMENT, `Payment for split ${i + 1} is insufficient`);
      }

      const receiptNumber = `${transaction.receiptNumber}-S${i + 1}`;
      const child = await this.transactionRepo.save({
        ...transaction,
        id: '',
        receiptNumber,
        subtotal,
        taxAmount,
        grandTotal,
        discountAmount: splitItems.reduce((sum, item) => sum + item.discountAmount, 0),
        notes: `Split from ${transaction.receiptNumber}`,
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      childTransactions.push({
        transactionId: child.id,
        receiptNumber,
        grandTotal,
      });
    }

    // Validate total matches
    const totalSplit = childTransactions.reduce((sum, c) => sum + c.grandTotal, 0);
    if (totalSplit !== transaction.grandTotal) {
      throw new BusinessError(ErrorCode.INVALID_TRANSACTION, 'Split totals do not match original transaction total');
    }

    return {
      parentTransactionId: input.transactionId,
      childTransactions,
    };
  }

  private async splitEvenly(
    transaction: TransactionRecord,
    _items: TransactionItemRecord[],
    input: SplitEvenlyInput,
  ): Promise<SplitBillOutput> {
    if (input.numberOfSplits < 2) {
      throw new BusinessError(ErrorCode.INVALID_TRANSACTION, 'Must split into at least 2 parts');
    }

    if (input.payments.length !== input.numberOfSplits) {
      throw new BusinessError(ErrorCode.INVALID_PAYMENT, 'Number of payments must match number of splits');
    }

    const splitAmount = Math.floor(transaction.grandTotal / input.numberOfSplits);
    const remainder = transaction.grandTotal - splitAmount * input.numberOfSplits;

    const childTransactions: SplitBillOutput['childTransactions'] = [];

    for (let i = 0; i < input.numberOfSplits; i++) {
      const grandTotal = i === 0 ? splitAmount + remainder : splitAmount;
      const payment = input.payments[i];

      if (payment.paymentAmount < grandTotal) {
        throw new BusinessError(ErrorCode.INVALID_PAYMENT, `Payment for split ${i + 1} is insufficient`);
      }

      const receiptNumber = `${transaction.receiptNumber}-S${i + 1}`;
      const child = await this.transactionRepo.save({
        ...transaction,
        id: '',
        receiptNumber,
        grandTotal,
        subtotal: grandTotal,
        taxAmount: 0,
        discountAmount: 0,
        notes: `Even split ${i + 1} of ${input.numberOfSplits} from ${transaction.receiptNumber}`,
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      childTransactions.push({
        transactionId: child.id,
        receiptNumber,
        grandTotal,
      });
    }

    // Validate total matches
    const totalSplit = childTransactions.reduce((sum, c) => sum + c.grandTotal, 0);
    if (totalSplit !== transaction.grandTotal) {
      throw new BusinessError(ErrorCode.INVALID_TRANSACTION, 'Split totals do not match original transaction total');
    }

    return {
      parentTransactionId: input.transactionId,
      childTransactions,
    };
  }
}
