import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import type { ITransactionRepository } from '@domain/interfaces/repositories/transaction.repository';

export interface MergeBillInput {
  transactionIds: string[];
  employeeId: string;
  businessId: string;
  outletId: string;
  paymentMethod: string;
}

@Injectable()
export class MergeBillUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.TRANSACTION)
    private readonly transactionRepo: ITransactionRepository,
  ) {}

  async execute(input: MergeBillInput): Promise<{ mergedTransactionId: string; grandTotal: number }> {
    const transactions = [];
    for (const id of input.transactionIds) {
      const tx = await this.transactionRepo.findById(id);
      if (!tx) throw new NotFoundException(`Transaction ${id} not found`);
      if (tx.status !== 'completed') {
        throw new BusinessError(ErrorCode.INVALID_TRANSACTION, `Transaction ${id} is not completed`);
      }
      transactions.push(tx);
    }

    const totalSubtotal = transactions.reduce((sum, tx) => sum + tx.subtotal, 0);
    const totalDiscount = transactions.reduce((sum, tx) => sum + tx.discountAmount, 0);
    const totalTax = transactions.reduce((sum, tx) => sum + tx.taxAmount, 0);
    const totalServiceCharge = transactions.reduce((sum, tx) => sum + tx.serviceCharge, 0);
    const grandTotal = totalSubtotal - totalDiscount + totalTax + totalServiceCharge;

    const receiptNumber = `MRG-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const merged = await this.transactionRepo.save({
      id: '',
      outletId: input.outletId,
      employeeId: input.employeeId,
      customerId: null,
      shiftId: transactions[0].shiftId,
      receiptNumber,
      transactionType: 'sale',
      orderType: transactions[0].orderType,
      tableId: null,
      subtotal: totalSubtotal,
      discountAmount: totalDiscount,
      taxAmount: totalTax,
      serviceCharge: totalServiceCharge,
      grandTotal,
      notes: `Merged from: ${input.transactionIds.join(', ')}`,
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    for (const id of input.transactionIds) {
      await this.transactionRepo.update(id, {
        status: 'voided',
        voidReason: `Merged into ${merged.id}`,
        voidedAt: new Date(),
        voidedBy: input.employeeId,
      });
    }

    return { mergedTransactionId: merged.id, grandTotal };
  }
}
