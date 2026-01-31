import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import type { ITransactionRepository } from '@domain/interfaces/repositories/transaction.repository';

@Injectable()
export class ReprintReceiptUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.TRANSACTION)
    private readonly transactionRepo: ITransactionRepository,
  ) {}

  async execute(transactionId: string): Promise<Record<string, unknown>> {
    const transaction = await this.transactionRepo.findById(transactionId);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const items = await this.transactionRepo.findItemsByTransactionId(transactionId);
    const payments = await this.transactionRepo.findPaymentsByTransactionId(transactionId);

    return {
      receiptNumber: transaction.receiptNumber,
      transactionType: transaction.transactionType,
      orderType: transaction.orderType,
      status: transaction.status,
      subtotal: transaction.subtotal,
      discountAmount: transaction.discountAmount,
      taxAmount: transaction.taxAmount,
      serviceCharge: transaction.serviceCharge,
      grandTotal: transaction.grandTotal,
      notes: transaction.notes,
      createdAt: transaction.createdAt,
      items: items.map(item => ({
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
        subtotal: item.subtotal,
      })),
      payments: payments.map(p => ({
        method: p.paymentMethod,
        amount: p.amount,
        referenceNumber: p.referenceNumber,
      })),
      isReprint: true,
      reprintedAt: new Date().toISOString(),
    };
  }
}
