import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  ICreditSaleRepository,
  CreditSaleRecord,
  CreditPaymentRecord,
  CreditSaleFilters,
  CustomerOutstandingSummary,
} from '../../domain/interfaces/repositories/credit-sale.repository';

@Injectable()
export class PrismaCreditSaleRepository implements ICreditSaleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CreditSaleRecord | null> {
    const record = await this.prisma.creditSale.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, phone: true } },
        transaction: { select: { receiptNumber: true } },
      },
    });
    return record ? this.mapToRecord(record) : null;
  }

  async findByTransactionId(transactionId: string): Promise<CreditSaleRecord | null> {
    const record = await this.prisma.creditSale.findFirst({
      where: { transactionId },
      include: {
        customer: { select: { name: true, phone: true } },
        transaction: { select: { receiptNumber: true } },
      },
    });
    return record ? this.mapToRecord(record) : null;
  }

  async findAll(filters: CreditSaleFilters): Promise<CreditSaleRecord[]> {
    const where: Record<string, unknown> = {};
    if (filters.outletId) where.outletId = filters.outletId;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      const createdAt: Record<string, Date> = {};
      if (filters.startDate) createdAt.gte = filters.startDate;
      if (filters.endDate) createdAt.lte = filters.endDate;
      where.createdAt = createdAt;
    }

    const records = await this.prisma.creditSale.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true } },
        transaction: { select: { receiptNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.mapToRecord(r));
  }

  async findByCustomerId(customerId: string, status?: string): Promise<CreditSaleRecord[]> {
    const where: Record<string, unknown> = { customerId };
    if (status) where.status = status;

    const records = await this.prisma.creditSale.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true } },
        transaction: { select: { receiptNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.mapToRecord(r));
  }

  async getCustomerOutstanding(
    businessId: string,
    outletId?: string,
  ): Promise<CustomerOutstandingSummary[]> {
    const where: Record<string, unknown> = {
      status: { in: ['outstanding', 'partially_paid'] },
    };
    if (outletId) where.outletId = outletId;

    const result = await this.prisma.creditSale.groupBy({
      by: ['customerId'],
      where,
      _sum: { outstandingAmount: true },
      _count: { id: true },
      _min: { createdAt: true },
    });

    const customerIds = result.map((r) => r.customerId);
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds }, businessId },
      select: { id: true, name: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c.name]));

    return result.map((r) => ({
      customerId: r.customerId,
      customerName: customerMap.get(r.customerId) || 'Unknown',
      totalOutstanding: Number(r._sum.outstandingAmount || 0),
      creditSaleCount: r._count.id,
      oldestDate: r._min.createdAt,
    }));
  }

  async getPayments(creditSaleId: string): Promise<CreditPaymentRecord[]> {
    const payments = await this.prisma.creditPayment.findMany({
      where: { creditSaleId },
      orderBy: { createdAt: 'desc' },
    });
    return payments.map((p) => ({
      id: p.id,
      creditSaleId: p.creditSaleId,
      amount: Number(p.amount),
      paymentMethod: p.paymentMethod,
      referenceNumber: p.referenceNumber,
      notes: p.notes,
      receivedBy: p.receivedBy,
      createdAt: p.createdAt,
    }));
  }

  private mapToRecord(record: Record<string, unknown>): CreditSaleRecord {
    const customer = record.customer as { name: string; phone: string | null } | undefined;
    const transaction = record.transaction as { receiptNumber: string } | undefined;

    return {
      id: record.id as string,
      transactionId: record.transactionId as string,
      customerId: record.customerId as string,
      outletId: record.outletId as string,
      totalAmount: Number(record.totalAmount),
      paidAmount: Number(record.paidAmount),
      outstandingAmount: Number(record.outstandingAmount),
      dueDate: record.dueDate as Date | null,
      status: record.status as string,
      notes: record.notes as string | null,
      createdBy: record.createdBy as string | null,
      createdAt: record.createdAt as Date,
      updatedAt: record.updatedAt as Date,
      customer: customer ? { name: customer.name, phone: customer.phone } : undefined,
      transaction: transaction ? { receiptNumber: transaction.receiptNumber } : undefined,
    };
  }
}
