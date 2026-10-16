import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { TenantAccessService } from '../../shared/tenant';
import { DocumentNumberService } from '../../shared/numbering';
import { toPrismaPage } from '../../shared/dtos/pagination-query.dto';
import { money, sumMoney, multiplyMoney, toNumber } from '../../shared/utils/money';
import { businessDateKey } from '../../shared/utils/business-time';
import { getDateRange } from '../reports/utils/date-range.util';
import type {
  CreatePurchaseOrderDto,
  CreateSupplierDto,
  PurchaseOrderListQueryDto,
  SupplierHistoryQueryDto,
  SupplierListQueryDto,
  UpdateSupplierDto,
} from '../../application/dtos/supplier.dto';

export interface SupplierPerformanceEntry {
  supplierId: string;
  supplierName: string;
  totalOrders: number;
  totalAmount: number;
  averageLeadTimeDays: number;
  fulfillmentRate: number;
  qualityIssues: number;
  lastOrderDate: Date | null;
}

export interface SupplierDetailedAnalytics extends SupplierPerformanceEntry {
  orderHistory: SupplierOrderHistoryEntry[];
  leadTimeTrend: LeadTimeTrendEntry[];
}

export interface SupplierOrderHistoryEntry {
  poId: string;
  poNumber: string;
  status: string;
  totalAmount: number;
  orderedAt: Date | null;
  receivedAt: Date | null;
  itemCount: number;
}

export interface LeadTimeTrendEntry {
  month: string;
  averageLeadTimeDays: number;
  orderCount: number;
}

export interface ReorderSuggestion {
  productId: string;
  productName: string;
  currentStock: number;
  minimumStock: number;
  suggestedQuantity: number;
  preferredSupplierId: string | null;
}

export interface AutoReorderResult {
  purchaseOrders: AutoReorderPOEntry[];
  /** Low-stock products skipped because an open (draft/ordered/partial) PO already covers them. */
  skippedProductIds: string[];
}

export interface AutoReorderPOEntry {
  purchaseOrderId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  itemCount: number;
  totalAmount: number;
}

export interface PurchaseOrderResult {
  id: string;
  poNumber: string;
  status: string;
  supplierId: string;
  supplierName: string;
  totalAmount: number;
  approvedBy: string;
  orderedAt: Date | null;
}

export interface PendingPOEntry {
  id: string;
  poNumber: string;
  status: string;
  supplierId: string;
  supplierName: string;
  outletId: string;
  outletName: string;
  totalAmount: number;
  itemCount: number;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: Date;
}

interface RawLowStockRow {
  product_id: string;
  product_name: string;
  current_stock: Prisma.Decimal | number | string;
  minimum_stock: number | string;
  cost_price: Prisma.Decimal | number | string | null;
}

interface RawComparisonRow {
  product_id: string;
  product_name: string;
  supplier_id: string;
  supplier_name: string;
  avg_price: Prisma.Decimal | number | string;
  min_price: Prisma.Decimal | number | string;
  max_price: Prisma.Decimal | number | string;
  order_count: bigint | number;
  last_order_date: Date;
}

interface RawReorderAlertRow {
  product_id: string;
  product_name: string;
  sku: string | null;
  outlet_name: string;
  quantity: Prisma.Decimal | number | string;
  low_stock_alert: number;
}

/** Hard cap for analytics/report queries (R13). */
const MAX_ANALYTICS_ROWS = 500;
/** Statuses that mean a PO is still open (not yet fully received / cancelled). */
const OPEN_PO_STATUSES = ['draft', 'ordered', 'partial'] as const;
const DAY_MS = 1000 * 60 * 60 * 24;

const PO_LIST_INCLUDE = {
  supplier: { select: { id: true, name: true } },
  outlet: { select: { id: true, name: true } },
  items: true,
} satisfies Prisma.PurchaseOrderInclude;

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantAccessService,
    private readonly numbers: DocumentNumberService,
  ) {}

  // ─── Supplier CRUD (all scoped by the caller's businessId, R3) ─────────

  async listSuppliers(businessId: string, query: SupplierListQueryDto = {}) {
    return this.prisma.supplier.findMany({
      where: { businessId, isActive: true },
      orderBy: { name: 'asc' },
      ...toPrismaPage(query),
    });
  }

  async getSupplier(businessId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, businessId } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async createSupplier(businessId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        businessId,
        name: dto.name,
        contactPerson: dto.contactPerson || null,
        phone: dto.phone || null,
        email: dto.email || null,
        address: dto.address || null,
        notes: dto.notes || null,
      },
    });
  }

  /** Only whitelisted fields reach Prisma (R7); businessId/id/isActive cannot be set. */
  async updateSupplier(businessId: string, id: string, dto: UpdateSupplierDto) {
    const data: Prisma.SupplierUpdateManyMutationInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.contactPerson !== undefined) data.contactPerson = dto.contactPerson || null;
    if (dto.phone !== undefined) data.phone = dto.phone || null;
    if (dto.email !== undefined) data.email = dto.email || null;
    if (dto.address !== undefined) data.address = dto.address || null;
    if (dto.notes !== undefined) data.notes = dto.notes || null;

    const { count } = await this.prisma.supplier.updateMany({ where: { id, businessId }, data });
    if (count === 0) throw new NotFoundException('Supplier not found');
    return this.getSupplier(businessId, id);
  }

  async deactivateSupplier(businessId: string, id: string): Promise<void> {
    const { count } = await this.prisma.supplier.updateMany({
      where: { id, businessId },
      data: { isActive: false },
    });
    if (count === 0) throw new NotFoundException('Supplier not found');
  }

  // ─── Analytics ─────────────────────────────────────────────────────────

  async getSupplierAnalytics(
    businessId: string,
    from: Date,
    to: Date,
  ): Promise<SupplierPerformanceEntry[]> {
    const suppliers = await this.prisma.supplier.findMany({
      where: { businessId, isActive: true },
      select: {
        id: true,
        name: true,
        purchaseOrders: {
          where: { createdAt: { gte: from, lte: to }, outlet: { businessId } },
          select: {
            status: true,
            totalAmount: true,
            orderedAt: true,
            receivedAt: true,
            createdAt: true,
            items: { select: { quantityOrdered: true, quantityReceived: true } },
          },
          take: MAX_ANALYTICS_ROWS,
        },
      },
      take: MAX_ANALYTICS_ROWS,
    });

    return suppliers.map((s) => ({
      supplierId: s.id,
      supplierName: s.name,
      ...this.computePerformance(s.purchaseOrders),
    }));
  }

  async getSupplierDetailedAnalytics(
    businessId: string,
    supplierId: string,
    from: Date,
    to: Date,
  ): Promise<SupplierDetailedAnalytics> {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, businessId },
      select: {
        id: true,
        name: true,
        purchaseOrders: {
          where: { createdAt: { gte: from, lte: to }, outlet: { businessId } },
          include: { items: { select: { quantityOrdered: true, quantityReceived: true } } },
          orderBy: { createdAt: 'desc' },
          take: MAX_ANALYTICS_ROWS,
        },
      },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const orders = supplier.purchaseOrders;
    const orderHistory: SupplierOrderHistoryEntry[] = orders.map((po) => ({
      poId: po.id,
      poNumber: po.poNumber,
      status: po.status,
      totalAmount: toNumber(po.totalAmount),
      orderedAt: po.orderedAt,
      receivedAt: po.receivedAt,
      itemCount: po.items.length,
    }));

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      ...this.computePerformance(orders),
      orderHistory,
      leadTimeTrend: this.computeLeadTimeTrend(orders.filter((po) => po.status === 'received')),
    };
  }

  private computePerformance(
    orders: Array<{
      status: string;
      totalAmount: Prisma.Decimal;
      orderedAt: Date | null;
      receivedAt: Date | null;
      createdAt: Date;
      items: Array<{ quantityOrdered: Prisma.Decimal; quantityReceived: Prisma.Decimal }>;
    }>,
  ): Omit<SupplierPerformanceEntry, 'supplierId' | 'supplierName'> {
    const totalOrders = orders.length;
    const totalAmount = sumMoney(orders.map((po) => po.totalAmount));

    const leadTimes = orders
      .filter((po) => po.status === 'received' && po.orderedAt && po.receivedAt)
      .map((po) => ((po.receivedAt as Date).getTime() - (po.orderedAt as Date).getTime()) / DAY_MS);
    const averageLeadTimeDays =
      leadTimes.length > 0 ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0;

    const received = orders.filter((po) => po.status === 'received');
    const fullyReceived = received.filter((po) =>
      po.items.every((i) => money(i.quantityReceived).gte(money(i.quantityOrdered))),
    ).length;
    const qualityIssues = received.filter((po) =>
      po.items.some((i) => !money(i.quantityReceived).eq(money(i.quantityOrdered))),
    ).length;

    const lastOrderDate = orders.reduce<Date | null>(
      (latest, po) => (!latest || po.createdAt > latest ? po.createdAt : latest),
      null,
    );

    return {
      totalOrders,
      totalAmount: toNumber(totalAmount.toDecimalPlaces(2)),
      averageLeadTimeDays: round(averageLeadTimeDays, 1),
      fulfillmentRate: totalOrders > 0 ? round((fullyReceived / totalOrders) * 100, 1) : 0,
      qualityIssues,
      lastOrderDate,
    };
  }

  // ─── Auto-Reorder ──────────────────────────────────────────────────────

  async getReorderSuggestions(user: AuthUser, outletId: string): Promise<ReorderSuggestion[]> {
    await this.tenant.assertOutlet(user, outletId);
    const rows = await this.findLowStockRows(outletId);
    const preferred = await this.findPreferredSuppliers(
      rows.map((r) => r.product_id),
      user.businessId,
    );
    return rows.map((row) => this.toSuggestion(row, preferred.get(row.product_id)?.supplierId));
  }

  /**
   * Creates draft POs for low-stock products, grouped by the last supplier each
   * product was received from (or the business's oldest active supplier).
   * Idempotent-ish: products that already sit on an open PO for this outlet are
   * skipped, so repeating the call does not duplicate drafts. Unit cost comes from
   * the last received PO line, falling back to the product cost price.
   */
  async autoReorder(user: AuthUser, outletId: string): Promise<AutoReorderResult> {
    await this.tenant.assertOutlet(user, outletId);
    const businessId = user.businessId;

    const rows = await this.findLowStockRows(outletId);
    if (rows.length === 0) return { purchaseOrders: [], skippedProductIds: [] };

    const productIds = rows.map((r) => r.product_id);
    const openLines = await this.prisma.purchaseOrderItem.findMany({
      where: {
        productId: { in: productIds },
        purchaseOrder: { outletId, status: { in: [...OPEN_PO_STATUSES] } },
      },
      select: { productId: true },
      distinct: ['productId'],
    });
    const covered = new Set(openLines.map((l) => l.productId));
    const pending = rows.filter((r) => !covered.has(r.product_id));
    const skippedProductIds = rows
      .filter((r) => covered.has(r.product_id))
      .map((r) => r.product_id);
    if (pending.length === 0) return { purchaseOrders: [], skippedProductIds };

    const preferred = await this.findPreferredSuppliers(
      pending.map((r) => r.product_id),
      businessId,
    );

    const preferredIds = [...new Set([...preferred.values()].map((p) => p.supplierId))];
    const suppliers = await this.prisma.supplier.findMany({
      where: { id: { in: preferredIds }, businessId, isActive: true },
      select: { id: true, name: true },
    });
    const supplierById = new Map(suppliers.map((s) => [s.id, s]));

    const groups = new Map<
      string,
      { supplier: { id: string; name: string }; rows: RawLowStockRow[] }
    >();
    const unassigned: RawLowStockRow[] = [];
    for (const row of pending) {
      const supplier = supplierById.get(preferred.get(row.product_id)?.supplierId ?? '');
      if (!supplier) {
        unassigned.push(row);
        continue;
      }
      const g = groups.get(supplier.id) ?? { supplier, rows: [] };
      g.rows.push(row);
      groups.set(supplier.id, g);
    }

    if (unassigned.length > 0) {
      const fallback = await this.prisma.supplier.findFirst({
        where: { businessId, isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true },
      });
      if (fallback) {
        const g = groups.get(fallback.id) ?? { supplier: fallback, rows: [] };
        g.rows.push(...unassigned);
        groups.set(fallback.id, g);
      }
    }

    if (groups.size === 0) return { purchaseOrders: [], skippedProductIds };

    const created = await this.prisma.$transaction(async (tx) => {
      const out: AutoReorderPOEntry[] = [];
      for (const { supplier, rows: groupRows } of groups.values()) {
        const items = groupRows.map((row) => {
          const suggestion = this.toSuggestion(row, supplier.id);
          const unitCost = money(preferred.get(row.product_id)?.unitCost ?? row.cost_price);
          const quantity = money(suggestion.suggestedQuantity);
          return {
            itemName: row.product_name,
            productId: row.product_id,
            quantityOrdered: quantity,
            unitCost,
            subtotal: multiplyMoney(quantity, unitCost).toDecimalPlaces(2),
          };
        });
        const totalAmount = sumMoney(items.map((i) => i.subtotal));
        const poNumber = await this.numbers.next(tx, businessId, 'PO');

        const po = await tx.purchaseOrder.create({
          data: {
            outletId,
            supplierId: supplier.id,
            poNumber,
            totalAmount,
            status: 'draft',
            createdBy: user.employeeId,
            notes: 'Auto-reorder',
            items: { create: items },
          },
          select: { id: true },
        });

        out.push({
          purchaseOrderId: po.id,
          poNumber,
          supplierId: supplier.id,
          supplierName: supplier.name,
          itemCount: items.length,
          totalAmount: toNumber(totalAmount),
        });
      }
      return out;
    });

    return { purchaseOrders: created, skippedProductIds };
  }

  private async findLowStockRows(outletId: string): Promise<RawLowStockRow[]> {
    return this.prisma.$queryRaw<RawLowStockRow[]>`
      SELECT
        sl.product_id,
        p.name AS product_name,
        sl.quantity AS current_stock,
        sl.low_stock_alert AS minimum_stock,
        p.cost_price
      FROM stock_levels sl
      JOIN products p ON p.id = sl.product_id
      WHERE sl.outlet_id = ${outletId}::uuid
        AND sl.product_id IS NOT NULL
        AND sl.variant_id IS NULL
        AND sl.quantity <= sl.low_stock_alert
        AND p.is_active = true
      ORDER BY sl.quantity ASC
      LIMIT ${MAX_ANALYTICS_ROWS}
    `;
  }

  private toSuggestion(row: RawLowStockRow, supplierId: string | undefined): ReorderSuggestion {
    const currentStock = Number(row.current_stock);
    const minimumStock = Number(row.minimum_stock);
    return {
      productId: row.product_id,
      productName: row.product_name,
      currentStock,
      minimumStock,
      suggestedQuantity: Math.max(minimumStock * 2 - currentStock, 1),
      preferredSupplierId: supplierId ?? null,
    };
  }

  /**
   * Last received PO line per product, restricted to the caller's business (one
   * query for all products, no N+1).
   */
  private async findPreferredSuppliers(
    productIds: string[],
    businessId: string,
  ): Promise<Map<string, { supplierId: string; unitCost: Prisma.Decimal }>> {
    if (productIds.length === 0) return new Map();
    const lines = await this.prisma.purchaseOrderItem.findMany({
      where: {
        productId: { in: productIds },
        purchaseOrder: { status: 'received', outlet: { businessId } },
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['productId'],
      select: { productId: true, unitCost: true, purchaseOrder: { select: { supplierId: true } } },
    });
    return new Map(
      lines.map((l) => [
        l.productId as string,
        { supplierId: l.purchaseOrder.supplierId, unitCost: l.unitCost },
      ]),
    );
  }

  // ─── Purchase Orders ───────────────────────────────────────────────────

  /**
   * GET /suppliers/purchase-orders. Returns a plain array (page of at most 100,
   * newest first) with supplier and outlet {id, name}.
   */
  async listPurchaseOrders(user: AuthUser, query: PurchaseOrderListQueryDto) {
    const outletIds = await this.tenant.resolveOutletIds(user, query.outletId);
    return this.prisma.purchaseOrder.findMany({
      where: {
        outletId: { in: outletIds },
        ...(query.status ? { status: query.status } : {}),
      },
      include: PO_LIST_INCLUDE,
      orderBy: { createdAt: 'desc' },
      ...toPrismaPage(query),
    });
  }

  async getPurchaseOrder(businessId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, outlet: { businessId } },
      include: PO_LIST_INCLUDE,
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  /**
   * Creates a draft PO. Every referenced id (outlet, supplier, product, variant,
   * ingredient) is verified against the caller's business before anything is
   * written (R3), totals are computed in Decimal (R8) and the PO number comes from
   * the per-tenant DocumentNumberService inside the same transaction (R15).
   */
  async createPurchaseOrder(user: AuthUser, dto: CreatePurchaseOrderDto) {
    const businessId = user.businessId;
    await this.tenant.assertOutlet(user, dto.outletId);
    await this.tenant.assertOwned('supplier', dto.supplierId, businessId);
    await this.tenant.assertOwned(
      'product',
      dto.items.map((i) => i.productId),
      businessId,
    );
    await this.tenant.assertOwned(
      'ingredient',
      dto.items.map((i) => i.ingredientId),
      businessId,
    );

    const variantIds = [
      ...new Set(dto.items.map((i) => i.variantId).filter((v): v is string => !!v)),
    ];
    const variants =
      variantIds.length > 0
        ? await this.prisma.productVariant.findMany({
            where: { id: { in: variantIds }, product: { businessId } },
            select: { id: true, productId: true },
          })
        : [];
    const variantProduct = new Map(variants.map((v) => [v.id, v.productId]));
    if (variantProduct.size !== variantIds.length) {
      throw new BadRequestException('One or more variants are not accessible');
    }

    const items = dto.items.map((i) => {
      let productId = i.productId ?? null;
      if (i.variantId) {
        const owner = variantProduct.get(i.variantId) as string;
        if (productId && productId !== owner) {
          throw new BadRequestException(
            `Variant ${i.variantId} does not belong to product ${productId}`,
          );
        }
        productId = owner;
      }
      if (productId && i.ingredientId) {
        throw new BadRequestException('A PO line references either a product or an ingredient');
      }
      const quantityOrdered = money(i.quantityOrdered);
      const unitCost = money(i.unitCost);
      return {
        itemName: i.itemName,
        quantityOrdered,
        unitCost,
        subtotal: multiplyMoney(quantityOrdered, unitCost).toDecimalPlaces(2),
        productId,
        variantId: i.variantId ?? null,
        ingredientId: i.ingredientId ?? null,
      };
    });
    const totalAmount = sumMoney(items.map((i) => i.subtotal));

    return this.prisma.$transaction(async (tx) => {
      const poNumber = await this.numbers.next(tx, businessId, 'PO');
      return tx.purchaseOrder.create({
        data: {
          outletId: dto.outletId,
          supplierId: dto.supplierId,
          poNumber,
          totalAmount,
          notes: dto.notes || null,
          createdBy: user.employeeId,
          items: { create: items },
        },
        include: PO_LIST_INCLUDE,
      });
    });
  }

  /** draft -> ordered, as a conditional update (R9). The approver is the JWT user. */
  async approvePurchaseOrder(
    businessId: string,
    poId: string,
    approverId: string,
    notes?: string,
  ): Promise<PurchaseOrderResult> {
    return this.transition(businessId, poId, ['draft'], approverId, (existing) => ({
      status: 'ordered',
      orderedAt: new Date(),
      notes: appendNote(existing, notes ? `Disetujui: ${notes}` : null),
    }));
  }

  /** draft|ordered -> cancelled, as a conditional update (R9). */
  async rejectPurchaseOrder(
    businessId: string,
    poId: string,
    rejecterId: string,
    reason: string,
  ): Promise<PurchaseOrderResult> {
    return this.transition(businessId, poId, ['draft', 'ordered'], rejecterId, (existing) => ({
      status: 'cancelled',
      notes: appendNote(existing, `Ditolak: ${reason}`),
    }));
  }

  private async transition(
    businessId: string,
    poId: string,
    from: Array<'draft' | 'ordered'>,
    actorId: string,
    build: (existingNotes: string | null) => Prisma.PurchaseOrderUpdateManyMutationInput,
  ): Promise<PurchaseOrderResult> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.purchaseOrder.findFirst({
        where: { id: poId, outlet: { businessId } },
        select: { id: true, status: true, notes: true },
      });
      if (!existing) throw new NotFoundException('Purchase order not found');

      const { count } = await tx.purchaseOrder.updateMany({
        where: { id: poId, status: { in: from } },
        data: build(existing.notes),
      });
      if (count === 0) {
        throw new ConflictException(
          `Cannot change PO with status "${existing.status}" (expected ${from.join(' or ')}).`,
        );
      }

      const po = await tx.purchaseOrder.findFirstOrThrow({
        where: { id: poId, outlet: { businessId } },
        include: { supplier: { select: { name: true } } },
      });
      return {
        id: po.id,
        poNumber: po.poNumber,
        status: po.status,
        supplierId: po.supplierId,
        supplierName: po.supplier.name,
        totalAmount: toNumber(po.totalAmount),
        approvedBy: actorId,
        orderedAt: po.orderedAt,
      };
    });
  }

  async getPendingPurchaseOrders(
    businessId: string,
    query: { page?: number; limit?: number } = {},
  ): Promise<PendingPOEntry[]> {
    const pos = await this.prisma.purchaseOrder.findMany({
      where: { status: 'draft', outlet: { businessId } },
      include: {
        supplier: { select: { name: true } },
        employee: { select: { id: true, name: true } },
        outlet: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      ...toPrismaPage({ page: query.page, limit: query.limit ?? 100 }),
    });

    return pos.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      status: po.status,
      supplierId: po.supplierId,
      supplierName: po.supplier.name,
      outletId: po.outletId,
      outletName: po.outlet.name,
      totalAmount: toNumber(po.totalAmount),
      itemCount: po._count.items,
      createdBy: po.createdBy,
      createdByName: po.employee?.name ?? null,
      createdAt: po.createdAt,
    }));
  }

  private computeLeadTimeTrend(
    receivedOrders: Array<{ orderedAt: Date | null; receivedAt: Date | null }>,
  ): LeadTimeTrendEntry[] {
    const monthMap = new Map<string, { totalDays: number; count: number }>();

    for (const po of receivedOrders) {
      if (!po.orderedAt || !po.receivedAt) continue;
      // Month bucket in business time (Asia/Jakarta), R14.
      const key = businessDateKey(po.receivedAt);
      const monthKey = `${key.slice(0, 4)}-${key.slice(4, 6)}`;
      const diffDays = (po.receivedAt.getTime() - po.orderedAt.getTime()) / DAY_MS;
      const entry = monthMap.get(monthKey) ?? { totalDays: 0, count: 0 };
      entry.totalDays += diffDays;
      entry.count += 1;
      monthMap.set(monthKey, entry);
    }

    return [...monthMap.keys()].sort().map((month) => {
      const e = monthMap.get(month) as { totalDays: number; count: number };
      return {
        month,
        averageLeadTimeDays: round(e.totalDays / e.count, 1),
        orderCount: e.count,
      };
    });
  }

  // ─── Supplier detail (purchase history / PO status) ─────────────────────

  /**
   * Purchase history for one supplier in a business-time date range
   * (default: this month). Summary figures are aggregated in SQL; the order list
   * is capped at 100 rows.
   */
  async getPurchaseHistory(businessId: string, supplierId: string, query: SupplierHistoryQueryDto) {
    const supplier = await this.getSupplier(businessId, supplierId);
    const { start, end } = getDateRange(query.dateRange, query.startDate, query.endDate);
    const where: Prisma.PurchaseOrderWhereInput = {
      supplierId,
      outlet: { businessId },
      createdAt: { gte: start, lte: end },
    };

    const [groups, orders] = await Promise.all([
      this.prisma.purchaseOrder.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.purchaseOrder.findMany({
        where,
        include: {
          outlet: { select: { name: true } },
          items: {
            select: { itemName: true, quantityOrdered: true, unitCost: true, subtotal: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    const countOf = (status: string) => groups.find((g) => g.status === status)?._count._all ?? 0;
    const totalOrders = groups.reduce((n, g) => n + g._count._all, 0);
    const totalPurchases = sumMoney(groups.map((g) => g._sum.totalAmount));

    return {
      supplierName: supplier.name,
      summary: {
        totalPurchases: toNumber(totalPurchases.toDecimalPlaces(2)),
        totalOrders,
        avgOrderValue:
          totalOrders > 0 ? toNumber(totalPurchases.dividedBy(totalOrders).toDecimalPlaces(2)) : 0,
        statusCounts: {
          pending: countOf('draft'),
          approved: countOf('ordered'),
          partial: countOf('partial'),
          completed: countOf('received'),
          cancelled: countOf('cancelled'),
        },
      },
      orders: orders.map((po) => ({
        id: po.id,
        orderNumber: po.poNumber,
        orderDate: po.orderedAt ?? po.createdAt,
        status: po.status,
        totalAmount: toNumber(po.totalAmount),
        outletName: po.outlet.name,
        itemCount: po.items.length,
        items: po.items.map((item) => ({
          productName: item.itemName,
          quantity: toNumber(item.quantityOrdered),
          unitPrice: toNumber(item.unitCost),
          subtotal: toNumber(item.subtotal),
        })),
      })),
    };
  }

  /**
   * PO receipt status for one supplier. TiloPOS has no supplier-payment ledger,
   * so this does NOT report debt, payments, due dates or overdue orders; it only
   * summarises which POs have been received (R10: no fabricated finance figures).
   * `paymentTracking: 'NOT_AVAILABLE'` makes that explicit to clients.
   *
   * Deprecated aliases kept for the current web client (same values, honest
   * meaning documented there): totalDebt = openAmount, totalPaid = receivedAmount,
   * paymentRate = receivedRate, unpaidOrdersCount = openOrdersCount,
   * unpaidOrders = openOrders.
   */
  async getPaymentStatus(businessId: string, supplierId: string) {
    const supplier = await this.getSupplier(businessId, supplierId);
    const where: Prisma.PurchaseOrderWhereInput = { supplierId, outlet: { businessId } };

    const [groups, open] = await Promise.all([
      this.prisma.purchaseOrder.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.purchaseOrder.findMany({
        where: { ...where, status: { in: [...OPEN_PO_STATUSES] } },
        select: {
          id: true,
          poNumber: true,
          status: true,
          totalAmount: true,
          orderedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 100,
      }),
    ]);

    const sumOf = (statuses: readonly string[]) =>
      sumMoney(groups.filter((g) => statuses.includes(g.status)).map((g) => g._sum.totalAmount));
    const countOfStatuses = (statuses: readonly string[]) =>
      groups.filter((g) => statuses.includes(g.status)).reduce((n, g) => n + g._count._all, 0);

    const receivedAmount = sumOf(['received']);
    const openAmount = sumOf(OPEN_PO_STATUSES);
    const totalPurchases = receivedAmount.plus(openAmount);
    const receivedRate = totalPurchases.gt(0)
      ? round(toNumber(receivedAmount.dividedBy(totalPurchases).times(100)), 1)
      : 0;
    const openOrdersCount = countOfStatuses(OPEN_PO_STATUSES);

    const openOrders = open.map((po) => ({
      id: po.id,
      orderNumber: po.poNumber,
      status: po.status,
      totalAmount: toNumber(po.totalAmount),
      orderDate: po.orderedAt ?? po.createdAt,
    }));

    return {
      supplierName: supplier.name,
      paymentTracking: 'NOT_AVAILABLE' as const,
      summary: {
        totalPurchases: toNumber(totalPurchases),
        openAmount: toNumber(openAmount),
        receivedAmount: toNumber(receivedAmount),
        receivedRate,
        openOrdersCount,
        /** @deprecated alias of openAmount (not a debt figure) */
        totalDebt: toNumber(openAmount),
        /** @deprecated alias of receivedAmount (not a payment figure) */
        totalPaid: toNumber(receivedAmount),
        /** @deprecated alias of receivedRate */
        paymentRate: receivedRate,
        /** @deprecated alias of openOrdersCount */
        unpaidOrdersCount: openOrdersCount,
      },
      openOrders,
      /** @deprecated alias of openOrders */
      unpaidOrders: openOrders,
    };
  }

  /**
   * Compare average received unit cost per product across suppliers, aggregated
   * in SQL (bounded, R13) and scoped to the caller's business.
   */
  async getSupplierComparison(businessId: string) {
    const rows = await this.prisma.$queryRaw<RawComparisonRow[]>`
      SELECT
        poi.product_id,
        p.name AS product_name,
        po.supplier_id,
        s.name AS supplier_name,
        AVG(poi.unit_cost) AS avg_price,
        MIN(poi.unit_cost) AS min_price,
        MAX(poi.unit_cost) AS max_price,
        COUNT(*) AS order_count,
        MAX(po.created_at) AS last_order_date
      FROM purchase_order_items poi
      JOIN purchase_orders po ON po.id = poi.purchase_order_id
      JOIN outlets o ON o.id = po.outlet_id
      JOIN suppliers s ON s.id = po.supplier_id
      JOIN products p ON p.id = poi.product_id
      WHERE o.business_id = ${businessId}::uuid
        AND p.business_id = ${businessId}::uuid
        AND po.status = 'received'
        AND poi.product_id IS NOT NULL
      GROUP BY poi.product_id, p.name, po.supplier_id, s.name
      LIMIT ${MAX_ANALYTICS_ROWS * 10}
    `;

    const byProduct = new Map<string, { productName: string; rows: RawComparisonRow[] }>();
    for (const row of rows) {
      const entry = byProduct.get(row.product_id) ?? { productName: row.product_name, rows: [] };
      entry.rows.push(row);
      byProduct.set(row.product_id, entry);
    }

    const comparisons = [];
    for (const [productId, product] of byProduct) {
      if (product.rows.length < 2) continue;

      const suppliers = product.rows
        .map((r) => ({
          supplierId: r.supplier_id,
          supplierName: r.supplier_name,
          avgPrice: toNumber(money(r.avg_price).toDecimalPlaces(2)),
          minPrice: toNumber(r.min_price),
          maxPrice: toNumber(r.max_price),
          orderCount: Number(r.order_count),
          lastOrderDate: r.last_order_date,
        }))
        .sort((a, b) => a.avgPrice - b.avgPrice);

      const cheapest = suppliers[0];
      const mostExpensive = suppliers[suppliers.length - 1];
      const priceDiff = money(mostExpensive.avgPrice).minus(cheapest.avgPrice);
      const savingsPct =
        mostExpensive.avgPrice > 0
          ? round(toNumber(priceDiff.dividedBy(mostExpensive.avgPrice).times(100)), 1)
          : 0;

      comparisons.push({
        productId,
        productName: product.productName,
        suppliers,
        cheapestSupplier: cheapest.supplierName,
        mostExpensivePrice: mostExpensive.avgPrice,
        priceDifference: toNumber(priceDiff.toDecimalPlaces(2)),
        savingsPercentage: savingsPct,
      });
    }

    comparisons.sort((a, b) => b.savingsPercentage - a.savingsPercentage);
    return {
      comparisons: comparisons.slice(0, MAX_ANALYTICS_ROWS),
      totalProducts: comparisons.length,
    };
  }

  /**
   * Low-stock alerts across the business. The low-stock filter runs in SQL
   * before the limit, so alerts are never silently dropped by a pre-filter cap.
   */
  async getReorderAlerts(businessId: string) {
    const rows = await this.prisma.$queryRaw<RawReorderAlertRow[]>`
      SELECT
        sl.product_id,
        p.name AS product_name,
        p.sku,
        o.name AS outlet_name,
        sl.quantity,
        sl.low_stock_alert
      FROM stock_levels sl
      JOIN outlets o ON o.id = sl.outlet_id
      JOIN products p ON p.id = sl.product_id
      WHERE o.business_id = ${businessId}::uuid
        AND p.business_id = ${businessId}::uuid
        AND p.is_active = true
        AND sl.product_id IS NOT NULL
        AND sl.quantity < sl.low_stock_alert
      ORDER BY sl.quantity ASC
      LIMIT ${MAX_ANALYTICS_ROWS}
    `;

    const lastLines = await this.prisma.purchaseOrderItem.findMany({
      where: {
        productId: { in: [...new Set(rows.map((r) => r.product_id))] },
        purchaseOrder: { status: 'received', outlet: { businessId } },
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['productId'],
      select: {
        productId: true,
        unitCost: true,
        purchaseOrder: { select: { supplier: { select: { id: true, name: true } } } },
      },
    });
    const lastByProduct = new Map(lastLines.map((l) => [l.productId, l]));

    const alerts = rows.map((row) => {
      const currentStock = toNumber(row.quantity);
      const last = lastByProduct.get(row.product_id);
      return {
        productId: row.product_id,
        productName: row.product_name,
        sku: row.sku || '',
        outletName: row.outlet_name,
        currentStock,
        recommendedSupplier: last
          ? {
              id: last.purchaseOrder.supplier.id,
              name: last.purchaseOrder.supplier.name,
              lastPrice: toNumber(last.unitCost),
            }
          : null,
        suggestedOrderQuantity: Math.max(row.low_stock_alert * 2 - currentStock, 1),
      };
    });

    return {
      alerts,
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter((a) => a.currentStock <= 5).length,
    };
  }
}

function appendNote(existing: string | null, note: string | null): string | null | undefined {
  if (!note) return undefined;
  return existing ? `${existing}\n${note}` : note;
}
