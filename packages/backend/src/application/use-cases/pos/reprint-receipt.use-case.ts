import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import type { ITransactionRepository } from '@domain/interfaces/repositories/transaction.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Injectable()
export class ReprintReceiptUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.TRANSACTION)
    private readonly transactionRepo: ITransactionRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(transactionId: string): Promise<Record<string, unknown>> {
    const transaction = await this.transactionRepo.findById(transactionId);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const items = await this.transactionRepo.findItemsByTransactionId(transactionId);
    const payments = await this.transactionRepo.findPaymentsByTransactionId(transactionId);

    // Fetch outlet, business, and employee data
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: transaction.outletId },
      select: { id: true, name: true, address: true, phone: true, businessId: true },
    });

    const business = outlet
      ? await this.prisma.business.findUnique({
          where: { id: outlet.businessId },
          select: { name: true, address: true, phone: true, taxId: true },
        })
      : null;

    const employee = transaction.employeeId
      ? await this.prisma.employee.findUnique({
          where: { id: transaction.employeeId },
          select: { name: true },
        })
      : null;

    return {
      transaction: {
        id: transaction.id,
        transactionNumber: transaction.receiptNumber,
        receiptNumber: transaction.receiptNumber,
        transactionType: transaction.transactionType,
        orderType: transaction.orderType,
        status: transaction.status,
        subtotal: transaction.subtotal,
        discountAmount: transaction.discountAmount,
        taxAmount: transaction.taxAmount,
        serviceCharge: transaction.serviceCharge,
        total: transaction.grandTotal,
        grandTotal: transaction.grandTotal,
        notes: transaction.notes,
        createdAt: transaction.createdAt,
        items: items.map((item) => ({
          id: item.id,
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          subtotal: item.subtotal,
          totalPrice: item.subtotal,
          modifiers: [],
          notes: item.notes,
        })),
        payments: payments.map((p) => ({
          id: p.id,
          method: p.paymentMethod,
          amount: p.amount,
          reference: p.referenceNumber,
          referenceNumber: p.referenceNumber,
        })),
      },
      business: business || { name: '-', address: '-', phone: '-', taxId: null },
      outlet: outlet || { id: '', name: '-', address: '-', phone: '-' },
      employee: employee || { name: '-' },
      customer: transaction.customerId ? { name: transaction.customerId } : undefined,
      isReprint: true,
      reprintedAt: new Date().toISOString(),
    };
  }
}
