import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

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
}

export interface AutoReorderPOEntry {
  supplierId: string;
  supplierName: string;
  itemCount: number;
  totalAmount: number;
}

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async getSupplierAnalytics(
    businessId: string,
    from: Date,
    to: Date,
  ): Promise<SupplierPerformanceEntry[]> {
    const suppliers = await this.prisma.supplier.findMany({
      where: { businessId, isActive: true },
      include: {
        purchaseOrders: {
          where: {
            createdAt: { gte: from, lte: to },
          },
          include: { items: true },
        },
      },
    });

    return suppliers.map((supplier) => {
      const orders = supplier.purchaseOrders;
      const totalOrders = orders.length;
      const totalAmount = orders.reduce(
        (sum, po) => sum + Number(po.totalAmount),
        0,
      );

      const receivedOrders = orders.filter(
        (po) => po.status === 'received' && po.orderedAt && po.receivedAt,
      );

      const averageLeadTimeDays =
        receivedOrders.length > 0
          ? receivedOrders.reduce((sum, po) => {
              const ordered = po.orderedAt as Date;
              const received = po.receivedAt as Date;
              const diffMs = received.getTime() - ordered.getTime();
              return sum + diffMs / (1000 * 60 * 60 * 24);
            }, 0) / receivedOrders.length
          : 0;

      const fullyReceivedOrders = orders.filter((po) => {
        if (po.status !== 'received') return false;
        return po.items.every(
          (item) =>
            Number(item.quantityReceived) >= Number(item.quantityOrdered),
        );
      });

      const fulfillmentRate =
        totalOrders > 0
          ? (fullyReceivedOrders.length / totalOrders) * 100
          : 0;

      const qualityIssues = orders.reduce((count, po) => {
        const hasDiscrepancy = po.items.some(
          (item) =>
            po.status === 'received' &&
            Number(item.quantityReceived) !== Number(item.quantityOrdered),
        );
        return hasDiscrepancy ? count + 1 : count;
      }, 0);

      const sortedOrders = [...orders].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      const lastOrderDate =
        sortedOrders.length > 0 ? sortedOrders[0].createdAt : null;

      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        totalOrders,
        totalAmount: Math.round(totalAmount * 100) / 100,
        averageLeadTimeDays: Math.round(averageLeadTimeDays * 10) / 10,
        fulfillmentRate: Math.round(fulfillmentRate * 10) / 10,
        qualityIssues,
        lastOrderDate,
      };
    });
  }

  async getSupplierDetailedAnalytics(
    supplierId: string,
    from: Date,
    to: Date,
  ): Promise<SupplierDetailedAnalytics | null> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      include: {
        purchaseOrders: {
          where: {
            createdAt: { gte: from, lte: to },
          },
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!supplier) return null;

    const orders = supplier.purchaseOrders;
    const totalOrders = orders.length;
    const totalAmount = orders.reduce(
      (sum, po) => sum + Number(po.totalAmount),
      0,
    );

    const receivedOrders = orders.filter(
      (po) => po.status === 'received' && po.orderedAt && po.receivedAt,
    );

    const averageLeadTimeDays =
      receivedOrders.length > 0
        ? receivedOrders.reduce((sum, po) => {
            const ordered = po.orderedAt as Date;
            const received = po.receivedAt as Date;
            const diffMs = received.getTime() - ordered.getTime();
            return sum + diffMs / (1000 * 60 * 60 * 24);
          }, 0) / receivedOrders.length
        : 0;

    const fullyReceivedOrders = orders.filter((po) => {
      if (po.status !== 'received') return false;
      return po.items.every(
        (item) =>
          Number(item.quantityReceived) >= Number(item.quantityOrdered),
      );
    });

    const fulfillmentRate =
      totalOrders > 0
        ? (fullyReceivedOrders.length / totalOrders) * 100
        : 0;

    const qualityIssues = orders.reduce((count, po) => {
      const hasDiscrepancy = po.items.some(
        (item) =>
          po.status === 'received' &&
          Number(item.quantityReceived) !== Number(item.quantityOrdered),
      );
      return hasDiscrepancy ? count + 1 : count;
    }, 0);

    const sortedOrders = [...orders].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const lastOrderDate =
      sortedOrders.length > 0 ? sortedOrders[0].createdAt : null;

    const orderHistory: SupplierOrderHistoryEntry[] = orders.map((po) => ({
      poId: po.id,
      poNumber: po.poNumber,
      status: po.status,
      totalAmount: Number(po.totalAmount),
      orderedAt: po.orderedAt,
      receivedAt: po.receivedAt,
      itemCount: po.items.length,
    }));

    const leadTimeTrend = this.computeLeadTimeTrend(receivedOrders);

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      totalOrders,
      totalAmount: Math.round(totalAmount * 100) / 100,
      averageLeadTimeDays: Math.round(averageLeadTimeDays * 10) / 10,
      fulfillmentRate: Math.round(fulfillmentRate * 10) / 10,
      qualityIssues,
      lastOrderDate,
      orderHistory,
      leadTimeTrend,
    };
  }

  async getReorderSuggestions(outletId: string): Promise<ReorderSuggestion[]> {
    const lowStockItems = await this.prisma.$queryRaw<RawLowStockRow[]>`
      SELECT
        sl.product_id,
        p.name AS product_name,
        sl.quantity AS current_stock,
        sl.low_stock_alert AS minimum_stock
      FROM stock_levels sl
      JOIN products p ON p.id = sl.product_id
      WHERE sl.outlet_id = ${outletId}::uuid
        AND sl.product_id IS NOT NULL
        AND sl.quantity <= sl.low_stock_alert
        AND p.is_active = true
      ORDER BY sl.quantity ASC
    `;

    const suggestions: ReorderSuggestion[] = [];

    for (const item of lowStockItems) {
      const currentStock =
        typeof item.current_stock === 'number'
          ? item.current_stock
          : Number(item.current_stock);
      const minimumStock =
        typeof item.minimum_stock === 'number'
          ? item.minimum_stock
          : Number(item.minimum_stock);

      const suggestedQuantity = Math.max(minimumStock * 2 - currentStock, 1);

      const preferredSupplier = await this.findPreferredSupplier(
        item.product_id,
      );

      suggestions.push({
        productId: item.product_id,
        productName: item.product_name,
        currentStock,
        minimumStock,
        suggestedQuantity,
        preferredSupplierId: preferredSupplier,
      });
    }

    return suggestions;
  }

  async autoReorder(
    outletId: string,
    createdBy: string,
  ): Promise<AutoReorderResult> {
    const suggestions = await this.getReorderSuggestions(outletId);

    if (suggestions.length === 0) {
      return { purchaseOrders: [] };
    }

    const grouped = new Map<
      string,
      { supplierId: string; items: typeof suggestions }
    >();

    const unassigned: typeof suggestions = [];

    for (const suggestion of suggestions) {
      if (suggestion.preferredSupplierId) {
        const existing = grouped.get(suggestion.preferredSupplierId);
        if (existing) {
          existing.items.push(suggestion);
        } else {
          grouped.set(suggestion.preferredSupplierId, {
            supplierId: suggestion.preferredSupplierId,
            items: [suggestion],
          });
        }
      } else {
        unassigned.push(suggestion);
      }
    }

    const createdPOs: AutoReorderPOEntry[] = [];

    for (const [supplierId, group] of grouped) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: supplierId },
      });

      if (!supplier) continue;

      const poNumber = `PO-AUTO-${Date.now().toString(36).toUpperCase()}-${supplierId.slice(0, 4)}`;

      const items = group.items.map((item) => {
        const unitCost = 0;
        return {
          itemName: item.productName,
          quantityOrdered: item.suggestedQuantity,
          unitCost,
          subtotal: item.suggestedQuantity * unitCost,
          productId: item.productId,
          variantId: null as string | null,
          ingredientId: null as string | null,
        };
      });

      const totalAmount = items.reduce((sum, i) => sum + i.subtotal, 0);

      await this.prisma.purchaseOrder.create({
        data: {
          outletId,
          supplierId,
          poNumber,
          totalAmount,
          status: 'draft',
          createdBy,
          items: {
            create: items.map((i) => ({
              itemName: i.itemName,
              quantityOrdered: i.quantityOrdered,
              unitCost: i.unitCost,
              subtotal: i.subtotal,
              productId: i.productId,
              variantId: i.variantId,
              ingredientId: i.ingredientId,
            })),
          },
        },
      });

      createdPOs.push({
        supplierId,
        supplierName: supplier.name,
        itemCount: group.items.length,
        totalAmount,
      });
    }

    if (unassigned.length > 0) {
      const defaultSupplier = await this.prisma.supplier.findFirst({
        where: {
          businessId: (
            await this.prisma.outlet.findUnique({ where: { id: outletId } })
          )?.businessId,
          isActive: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (defaultSupplier) {
        const poNumber = `PO-AUTO-${Date.now().toString(36).toUpperCase()}-DFLT`;

        const items = unassigned.map((item) => ({
          itemName: item.productName,
          quantityOrdered: item.suggestedQuantity,
          unitCost: 0,
          subtotal: 0,
          productId: item.productId,
          variantId: null as string | null,
          ingredientId: null as string | null,
        }));

        await this.prisma.purchaseOrder.create({
          data: {
            outletId,
            supplierId: defaultSupplier.id,
            poNumber,
            totalAmount: 0,
            status: 'draft',
            createdBy,
            items: {
              create: items.map((i) => ({
                itemName: i.itemName,
                quantityOrdered: i.quantityOrdered,
                unitCost: i.unitCost,
                subtotal: i.subtotal,
                productId: i.productId,
                variantId: i.variantId,
                ingredientId: i.ingredientId,
              })),
            },
          },
        });

        createdPOs.push({
          supplierId: defaultSupplier.id,
          supplierName: defaultSupplier.name,
          itemCount: unassigned.length,
          totalAmount: 0,
        });
      }
    }

    return { purchaseOrders: createdPOs };
  }

  async findPurchaseOrdersByBusiness(
    businessId: string,
    status?: string,
  ) {
    const where: Record<string, unknown> = {
      outlet: { businessId },
    };
    if (status) {
      where.status = status;
    }

    return this.prisma.purchaseOrder.findMany({
      where,
      include: { supplier: true, items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approvePurchaseOrder(
    poId: string,
    approvedBy: string,
    notes?: string,
  ): Promise<PurchaseOrderResult> {
    const po = await this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: 'ordered',
        orderedAt: new Date(),
        notes: notes || undefined,
      },
      include: { supplier: true, items: true },
    });

    return {
      id: po.id,
      poNumber: po.poNumber,
      status: po.status,
      supplierId: po.supplierId,
      supplierName: po.supplier.name,
      totalAmount: Number(po.totalAmount),
      approvedBy,
      orderedAt: po.orderedAt,
    };
  }

  async rejectPurchaseOrder(
    poId: string,
    rejectedBy: string,
    reason: string,
  ): Promise<PurchaseOrderResult> {
    const po = await this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: 'cancelled',
        notes: `Rejected by ${rejectedBy}: ${reason}`,
      },
      include: { supplier: true, items: true },
    });

    return {
      id: po.id,
      poNumber: po.poNumber,
      status: po.status,
      supplierId: po.supplierId,
      supplierName: po.supplier.name,
      totalAmount: Number(po.totalAmount),
      approvedBy: rejectedBy,
      orderedAt: po.orderedAt,
    };
  }

  async getPendingPurchaseOrders(
    businessId: string,
  ): Promise<PendingPOEntry[]> {
    const pos = await this.prisma.purchaseOrder.findMany({
      where: {
        status: 'draft',
        outlet: { businessId },
      },
      include: {
        supplier: true,
        items: true,
        employee: true,
        outlet: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return pos.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      status: po.status,
      supplierId: po.supplierId,
      supplierName: po.supplier.name,
      outletId: po.outletId,
      outletName: po.outlet.name,
      totalAmount: Number(po.totalAmount),
      itemCount: po.items.length,
      createdBy: po.createdBy,
      createdByName: po.employee?.name ?? null,
      createdAt: po.createdAt,
    }));
  }

  private computeLeadTimeTrend(
    receivedOrders: Array<{
      orderedAt: Date | null;
      receivedAt: Date | null;
    }>,
  ): LeadTimeTrendEntry[] {
    const monthMap = new Map<string, { totalDays: number; count: number }>();

    for (const po of receivedOrders) {
      if (!po.orderedAt || !po.receivedAt) continue;

      const monthKey = `${po.receivedAt.getFullYear()}-${String(
        po.receivedAt.getMonth() + 1,
      ).padStart(2, '0')}`;

      const diffMs = po.receivedAt.getTime() - po.orderedAt.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      const existing = monthMap.get(monthKey);
      if (existing) {
        existing.totalDays += diffDays;
        existing.count += 1;
      } else {
        monthMap.set(monthKey, { totalDays: diffDays, count: 1 });
      }
    }

    const trend: LeadTimeTrendEntry[] = [];

    const sortedKeys = [...monthMap.keys()].sort();
    for (const key of sortedKeys) {
      const entry = monthMap.get(key);
      if (entry) {
        trend.push({
          month: key,
          averageLeadTimeDays:
            Math.round((entry.totalDays / entry.count) * 10) / 10,
          orderCount: entry.count,
        });
      }
    }

    return trend;
  }

  private async findPreferredSupplier(
    productId: string,
  ): Promise<string | null> {
    const recentPO = await this.prisma.purchaseOrderItem.findFirst({
      where: {
        productId,
        purchaseOrder: { status: 'received' },
      },
      include: { purchaseOrder: true },
      orderBy: { createdAt: 'desc' },
    });

    return recentPO?.purchaseOrder.supplierId ?? null;
  }
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
  current_stock: number | string;
  minimum_stock: number | string;
}
