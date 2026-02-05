import { Injectable } from '@nestjs/common';
import type {
  ITransactionRepository,
  TransactionRecord,
  TransactionItemRecord,
  PaymentRecord,
} from '../../domain/interfaces/repositories/transaction.repository';
import { PrismaService } from '../database/prisma.service';
import { decimalToNumberRequired } from './decimal.helper';
import type {
  Transaction as PrismaTransaction,
  TransactionItem as PrismaTransactionItem,
  TransactionItemModifier as PrismaTransactionItemModifier,
  Payment as PrismaPayment,
  Outlet as PrismaOutlet,
} from '@prisma/client';

type TransactionWithRelations = PrismaTransaction & {
  outlet?: Pick<PrismaOutlet, 'businessId'>;
  items?: (PrismaTransactionItem & {
    modifiers?: PrismaTransactionItemModifier[];
  })[];
  payments?: PrismaPayment[];
};

@Injectable()
export class PrismaTransactionRepository implements ITransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TransactionRecord | null> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        outlet: {
          select: { businessId: true },
        },
        items: {
          include: {
            modifiers: true,
          },
        },
        payments: true,
      },
    });

    if (!transaction) {
      return null;
    }

    return this.toTransactionRecord(transaction);
  }

  async findByReceiptNumber(receiptNumber: string): Promise<TransactionRecord | null> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { receiptNumber },
      include: {
        items: {
          include: {
            modifiers: true,
          },
        },
        payments: true,
      },
    });

    if (!transaction) {
      return null;
    }

    return this.toTransactionRecord(transaction);
  }

  async findByOutletAndDateRange(
    outletId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TransactionRecord[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        outletId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map((transaction) => this.toTransactionRecord(transaction));
  }

  async save(transaction: TransactionRecord): Promise<TransactionRecord> {
    const created = await this.prisma.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          id: transaction.id,
          outletId: transaction.outletId,
          employeeId: transaction.employeeId,
          customerId: transaction.customerId,
          shiftId: transaction.shiftId,
          receiptNumber: transaction.receiptNumber,
          transactionType: transaction.transactionType as 'sale' | 'refund',
          orderType: transaction.orderType as 'dine_in' | 'takeaway' | 'delivery',
          tableId: transaction.tableId,
          subtotal: transaction.subtotal,
          discountAmount: transaction.discountAmount,
          taxAmount: transaction.taxAmount,
          serviceCharge: transaction.serviceCharge,
          grandTotal: transaction.grandTotal,
          notes: transaction.notes,
          status: transaction.status as 'pending' | 'completed' | 'voided' | 'refunded',
        },
        include: {
          items: {
            include: {
              modifiers: true,
            },
          },
          payments: true,
        },
      });

      return newTransaction;
    });

    return this.toTransactionRecord(created);
  }

  async update(id: string, data: Partial<TransactionRecord>): Promise<TransactionRecord> {
    const updated = await this.prisma.transaction.update({
      where: { id },
      data: {
        ...(data.employeeId !== undefined && { employeeId: data.employeeId }),
        ...(data.customerId !== undefined && { customerId: data.customerId }),
        ...(data.shiftId !== undefined && { shiftId: data.shiftId }),
        ...(data.transactionType !== undefined && {
          transactionType: data.transactionType as 'sale' | 'refund',
        }),
        ...(data.orderType !== undefined && {
          orderType: data.orderType as 'dine_in' | 'takeaway' | 'delivery',
        }),
        ...(data.tableId !== undefined && { tableId: data.tableId }),
        ...(data.subtotal !== undefined && { subtotal: data.subtotal }),
        ...(data.discountAmount !== undefined && { discountAmount: data.discountAmount }),
        ...(data.taxAmount !== undefined && { taxAmount: data.taxAmount }),
        ...(data.serviceCharge !== undefined && { serviceCharge: data.serviceCharge }),
        ...(data.grandTotal !== undefined && { grandTotal: data.grandTotal }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.status !== undefined && {
          status: data.status as 'pending' | 'completed' | 'voided' | 'refunded',
        }),
        ...(data.voidedAt !== undefined && { voidedAt: data.voidedAt }),
        ...(data.voidedBy !== undefined && { voidedBy: data.voidedBy }),
        ...(data.voidReason !== undefined && { voidReason: data.voidReason }),
      },
      include: {
        items: {
          include: {
            modifiers: true,
          },
        },
        payments: true,
      },
    });

    return this.toTransactionRecord(updated);
  }

  async findItemsByTransactionId(transactionId: string): Promise<TransactionItemRecord[]> {
    const items = await this.prisma.transactionItem.findMany({
      where: { transactionId },
    });

    return items.map((item) => ({
      id: item.id,
      transactionId: item.transactionId,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName,
      quantity: item.quantity.toNumber(),
      unitPrice: decimalToNumberRequired(item.unitPrice),
      discountAmount: decimalToNumberRequired(item.discountAmount),
      subtotal: decimalToNumberRequired(item.subtotal),
      notes: item.notes,
    }));
  }

  async findPaymentsByTransactionId(transactionId: string): Promise<PaymentRecord[]> {
    const payments = await this.prisma.payment.findMany({
      where: { transactionId },
    });

    return payments.map((payment) => ({
      id: payment.id,
      transactionId: payment.transactionId,
      paymentMethod: payment.paymentMethod,
      amount: decimalToNumberRequired(payment.amount),
      referenceNumber: payment.referenceNumber,
      status: payment.status,
    }));
  }

  private toTransactionRecord(transaction: TransactionWithRelations): TransactionRecord {
    return {
      id: transaction.id,
      businessId: transaction.outlet?.businessId,
      outletId: transaction.outletId,
      employeeId: transaction.employeeId,
      customerId: transaction.customerId,
      shiftId: transaction.shiftId,
      receiptNumber: transaction.receiptNumber,
      transactionType: transaction.transactionType,
      orderType: transaction.orderType,
      tableId: transaction.tableId,
      subtotal: decimalToNumberRequired(transaction.subtotal),
      discountAmount: decimalToNumberRequired(transaction.discountAmount),
      taxAmount: decimalToNumberRequired(transaction.taxAmount),
      serviceCharge: decimalToNumberRequired(transaction.serviceCharge),
      grandTotal: decimalToNumberRequired(transaction.grandTotal),
      notes: transaction.notes,
      status: transaction.status,
      voidedAt: (transaction as Record<string, unknown>).voidedAt as Date | undefined,
      voidedBy: (transaction as Record<string, unknown>).voidedBy as string | undefined,
      voidReason: (transaction as Record<string, unknown>).voidReason as string | undefined,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}
