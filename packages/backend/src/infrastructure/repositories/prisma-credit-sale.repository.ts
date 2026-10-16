import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { toNumber } from '@shared/utils/money';
import { MAX_PAGE_SIZE } from '@shared/dtos/pagination-query.dto';
import type {
  CreditSaleRecord,
  CreditPaymentRecord,
  CustomerOutstandingSummary,
} from '../../domain/interfaces/repositories/credit-sale.repository';

/** Statuses that still carry an open receivable. */
export const OPEN_CREDIT_STATUSES = ['outstanding', 'partially_paid', 'overdue'] as const;

export interface CreditSaleListFilters {
  businessId: string;
  /** Always a verified list (TenantAccessService.resolveOutletIds). */
  outletIds: string[];
  customerId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  skip?: number;
  take?: number;
}

export interface CreditSaleRecordWithNotes extends CreditSaleRecord {
  /** Credit/BON agreement notes (stored in credit_sales.notes). */
  creditNotes: string | null;
}

const INCLUDE = {
  customer: { select: { name: true, phone: true } },
  transaction: { select: { receiptNumber: true } },
} satisfies Prisma.CreditSaleInclude;

type CreditSaleRow = Prisma.CreditSaleGetPayload<{ include: typeof INCLUDE }>;

/**
 * Credit sales are always read through the owning outlet's business
 * (Docs/ENGINEERING-RULES.md R3): every method requires businessId.
 */
@Injectable()
export class PrismaCreditSaleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, businessId: string): Promise<CreditSaleRecordWithNotes | null> {
    const record = await this.prisma.creditSale.findFirst({
      where: { id, outlet: { businessId } },
      include: INCLUDE,
    });
    return record ? this.mapToRecord(record) : null;
  }

  async findByTransactionId(
    transactionId: string,
    businessId: string,
  ): Promise<CreditSaleRecordWithNotes | null> {
    const record = await this.prisma.creditSale.findFirst({
      where: { transactionId, outlet: { businessId } },
      include: INCLUDE,
    });
    return record ? this.mapToRecord(record) : null;
  }

  async findAll(filters: CreditSaleListFilters): Promise<CreditSaleRecordWithNotes[]> {
    const where: Prisma.CreditSaleWhereInput = {
      outletId: { in: filters.outletIds },
      outlet: { businessId: filters.businessId },
    };
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {
        ...(filters.startDate ? { gte: filters.startDate } : {}),
        ...(filters.endDate ? { lte: filters.endDate } : {}),
      };
    }

    const records = await this.prisma.creditSale.findMany({
      where,
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: filters.skip ?? 0,
      take: Math.min(filters.take ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE),
    });
    return records.map((r) => this.mapToRecord(r));
  }

  async findByCustomerId(
    customerId: string,
    businessId: string,
    opts: { status?: string; outletIds?: string[]; skip?: number; take?: number } = {},
  ): Promise<CreditSaleRecordWithNotes[]> {
    const where: Prisma.CreditSaleWhereInput = {
      customerId,
      outlet: { businessId },
      customer: { businessId },
    };
    if (opts.status) where.status = opts.status;
    if (opts.outletIds) where.outletId = { in: opts.outletIds };

    const records = await this.prisma.creditSale.findMany({
      where,
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: opts.skip ?? 0,
      take: Math.min(opts.take ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE),
    });
    return records.map((r) => this.mapToRecord(r));
  }

  /**
   * Open receivables per customer of this business. Cross-tenant rows can never
   * appear: the groupBy is scoped by the outlet's business and customers that do
   * not belong to the business are dropped (never reported as "Unknown").
   */
  async getCustomerOutstanding(
    businessId: string,
    outletIds?: string[],
  ): Promise<CustomerOutstandingSummary[]> {
    const where: Prisma.CreditSaleWhereInput = {
      status: { in: [...OPEN_CREDIT_STATUSES] },
      outlet: { businessId },
      customer: { businessId },
    };
    if (outletIds) where.outletId = { in: outletIds };

    const result = await this.prisma.creditSale.groupBy({
      by: ['customerId'],
      where,
      _sum: { outstandingAmount: true },
      _count: { id: true },
      _min: { createdAt: true },
    });

    const customerIds = result.map((r) => r.customerId);
    const customers = customerIds.length
      ? await this.prisma.customer.findMany({
          where: { id: { in: customerIds }, businessId },
          select: { id: true, name: true },
        })
      : [];
    const customerMap = new Map(customers.map((c) => [c.id, c.name]));

    return result
      .filter((r) => customerMap.has(r.customerId))
      .map((r) => ({
        customerId: r.customerId,
        customerName: customerMap.get(r.customerId) as string,
        totalOutstanding: toNumber(r._sum.outstandingAmount),
        creditSaleCount: r._count.id,
        oldestDate: r._min.createdAt,
      }));
  }

  async getPayments(
    creditSaleId: string,
    businessId: string,
    page: { skip?: number; take?: number } = {},
  ): Promise<CreditPaymentRecord[]> {
    const payments = await this.prisma.creditPayment.findMany({
      where: { creditSaleId, creditSale: { outlet: { businessId } } },
      orderBy: { createdAt: 'desc' },
      skip: page.skip ?? 0,
      take: Math.min(page.take ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE),
    });
    return payments.map((p) => ({
      id: p.id,
      creditSaleId: p.creditSaleId,
      amount: toNumber(p.amount),
      paymentMethod: p.paymentMethod,
      referenceNumber: p.referenceNumber,
      notes: p.notes,
      receivedBy: p.receivedBy,
      createdAt: p.createdAt,
    }));
  }

  /** Money is converted to numbers only here, at the API boundary. */
  private mapToRecord(record: CreditSaleRow): CreditSaleRecordWithNotes {
    return {
      id: record.id,
      transactionId: record.transactionId,
      customerId: record.customerId,
      outletId: record.outletId,
      totalAmount: toNumber(record.totalAmount),
      paidAmount: toNumber(record.paidAmount),
      outstandingAmount: toNumber(record.outstandingAmount),
      dueDate: record.dueDate,
      status: record.status,
      notes: record.notes,
      creditNotes: record.notes,
      createdBy: record.createdBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      customer: record.customer
        ? { name: record.customer.name, phone: record.customer.phone }
        : undefined,
      transaction: record.transaction
        ? { receiptNumber: record.transaction.receiptNumber }
        : undefined,
    };
  }
}
