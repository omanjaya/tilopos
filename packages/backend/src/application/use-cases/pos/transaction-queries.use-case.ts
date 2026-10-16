import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, TransactionStatus } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type { AuthUser } from '@infrastructure/auth/auth-user.interface';
import { TenantAccessService } from '@shared/tenant';
import { EmployeeRole } from '@shared/constants/roles';
import { money, sumMoney, nonNegative } from '@shared/utils/money';
import { parseBusinessDate } from '@shared/utils/business-time';

export interface ListTransactionsQuery {
  page?: number;
  limit?: number;
  /** One status, a comma-separated list, or 'all'. */
  status?: string;
  /** YYYY-MM-DD (Asia/Jakarta business day) or a full ISO instant. */
  startDate?: string;
  endDate?: string;
  outletId?: string;
  search?: string;
}

const TRANSACTION_STATUSES: readonly TransactionStatus[] = [
  'pending',
  'completed',
  'voided',
  'refunded',
  'partially_refunded',
  'credit',
  'partially_paid',
  'split',
];

const DETAIL_INCLUDE = {
  items: { include: { modifiers: true } },
  payments: true,
  employee: { select: { name: true } },
  customer: { select: { name: true } },
  voidedByEmployee: { select: { name: true } },
} satisfies Prisma.TransactionInclude;

type TransactionWithDetail = Prisma.TransactionGetPayload<{ include: typeof DETAIL_INCLUDE }>;

/** Roles that may act on every outlet of the business. */
const BUSINESS_WIDE_ROLES: ReadonlySet<string> = new Set([
  EmployeeRole.SUPER_ADMIN,
  EmployeeRole.OWNER,
]);

/**
 * Read side of POS transactions (list/detail) and the shared access check used
 * by refund/void/payment/reprint routes. Everything is scoped to the caller's
 * business; staff assigned to an outlet only reach that outlet.
 */
@Injectable()
export class TransactionQueriesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantAccessService,
  ) {}

  /**
   * Loads the transaction's outlet within the caller's business and enforces
   * outlet access (owners: any outlet; managers without an outlet: any outlet;
   * everyone else: only their assigned outlet).
   */
  async assertAccess(
    user: AuthUser,
    transactionId: string,
  ): Promise<{ id: string; outletId: string }> {
    const tx = await this.prisma.transaction.findFirst({
      where: { id: transactionId, outlet: { businessId: user.businessId } },
      select: { id: true, outletId: true },
    });
    if (!tx) throw new NotFoundException('Transaction not found');
    this.assertOutletAccess(user, tx.outletId);
    return tx;
  }

  assertOutletAccess(user: AuthUser, outletId: string): void {
    if (BUSINESS_WIDE_ROLES.has(user.role)) return;
    if (!user.outletId) {
      if (user.role === EmployeeRole.MANAGER) return;
      throw new ForbiddenException('You must be assigned to an outlet');
    }
    if (user.outletId !== outletId) {
      throw new ForbiddenException('You can only access transactions of your outlet');
    }
  }

  /** Outlet ids the caller may list (single requested outlet or all allowed). */
  async resolveListOutlets(user: AuthUser, requested?: string): Promise<string[]> {
    if (
      BUSINESS_WIDE_ROLES.has(user.role) ||
      (!user.outletId && user.role === EmployeeRole.MANAGER)
    ) {
      return this.tenant.resolveOutletIds(user, requested);
    }
    if (!user.outletId) throw new ForbiddenException('You must be assigned to an outlet');
    if (requested && requested !== user.outletId) {
      throw new ForbiddenException('You can only access transactions of your outlet');
    }
    return [user.outletId];
  }

  async list(user: AuthUser, query: ListTransactionsQuery) {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const page = Math.max(query.page ?? 1, 1);
    const outletIds = await this.resolveListOutlets(user, query.outletId);

    const where: Prisma.TransactionWhereInput = { outletId: { in: outletIds } };

    const statuses = this.parseStatuses(query.status);
    if (statuses) where.status = { in: statuses };

    const createdAt: Prisma.DateTimeFilter = {};
    if (query.startDate) createdAt.gte = this.parseBoundary(query.startDate, 'start');
    if (query.endDate) createdAt.lte = this.parseBoundary(query.endDate, 'end');
    if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;

    if (query.search) {
      where.OR = [
        { receiptNumber: { contains: query.search, mode: 'insensitive' } },
        { customer: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [transactions, total, aggregate] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include: DETAIL_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.aggregate({
        where,
        _sum: { grandTotal: true, subtotal: true, discountAmount: true },
      }),
    ]);

    return {
      data: transactions.map((tx) => this.toDto(tx)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        count: total,
        grandTotal: money(aggregate._sum.grandTotal).toNumber(),
        netSales: money(aggregate._sum.subtotal)
          .minus(money(aggregate._sum.discountAmount))
          .toNumber(),
      },
    };
  }

  async get(user: AuthUser, id: string) {
    await this.assertAccess(user, id);
    const tx = await this.prisma.transaction.findFirst({
      where: { id, outlet: { businessId: user.businessId } },
      include: DETAIL_INCLUDE,
    });
    if (!tx) throw new NotFoundException('Transaction not found');
    return this.toDto(tx);
  }

  private toDto(tx: TransactionWithDetail) {
    const paidAmount = sumMoney(
      tx.payments.filter((p) => p.status === 'completed').map((p) => p.amount),
    );
    const totalAmount = money(tx.grandTotal);
    return {
      id: tx.id,
      transactionNumber: tx.receiptNumber,
      transactionType: tx.transactionType,
      orderType: tx.orderType,
      status: tx.status,
      subtotal: money(tx.subtotal).toNumber(),
      discountAmount: money(tx.discountAmount).toNumber(),
      taxAmount: money(tx.taxAmount).toNumber(),
      serviceCharge: money(tx.serviceCharge).toNumber(),
      roundingAmount: money(tx.roundingAmount).toNumber(),
      totalAmount: totalAmount.toNumber(),
      paidAmount: paidAmount.toNumber(),
      changeAmount: nonNegative(paidAmount.minus(totalAmount)).toNumber(),
      customerId: tx.customerId,
      customerName: tx.customer?.name ?? null,
      employeeName: tx.employee?.name ?? '',
      outletId: tx.outletId,
      refundOfId: tx.refundOfId,
      notes: tx.notes,
      items: tx.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        bundleId: item.bundleId,
        productName: item.productName,
        variantName: item.variantName,
        quantity: money(item.quantity).toNumber(),
        unitPrice: money(item.unitPrice).toNumber(),
        totalPrice: money(item.subtotal).toNumber(),
        modifiers: item.modifiers.map((m) => m.modifierName),
        notes: item.notes,
      })),
      payments: tx.payments.map((p) => ({
        id: p.id,
        method: p.paymentMethod,
        amount: money(p.amount).toNumber(),
        status: p.status,
        reference: p.referenceNumber,
        createdAt: p.createdAt.toISOString(),
      })),
      voidedAt: tx.voidedAt?.toISOString() ?? null,
      voidedBy: tx.voidedByEmployee?.name ?? null,
      voidReason: tx.voidReason ?? null,
      createdAt: tx.createdAt.toISOString(),
      updatedAt: tx.updatedAt.toISOString(),
    };
  }

  private parseStatuses(status?: string): TransactionStatus[] | null {
    if (!status || status === 'all') return null;
    const list = status
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is TransactionStatus =>
        (TRANSACTION_STATUSES as readonly string[]).includes(s),
      );
    return list.length > 0 ? list : null;
  }

  /** Date-only values are Jakarta business days; full ISO instants are used as-is. */
  private parseBoundary(value: string, edge: 'start' | 'end'): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const range = parseBusinessDate(value);
      return edge === 'start' ? range.start : range.end;
    }
    return new Date(value);
  }
}
