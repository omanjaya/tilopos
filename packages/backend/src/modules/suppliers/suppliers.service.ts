import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
      const totalAmount = orders.reduce((sum, po) => sum + Number(po.totalAmount), 0);

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
          (item) => Number(item.quantityReceived) >= Number(item.quantityOrdered),
        );
      });

      const fulfillmentRate =
        totalOrders > 0 ? (fullyReceivedOrders.length / totalOrders) * 100 : 0;

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
      const lastOrderDate = sortedOrders.length > 0 ? sortedOrders[0].createdAt : null;

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
    const totalAmount = orders.reduce((sum, po) => sum + Number(po.totalAmount), 0);

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
        (item) => Number(item.quantityReceived) >= Number(item.quantityOrdered),
      );
    });

    const fulfillmentRate = totalOrders > 0 ? (fullyReceivedOrders.length / totalOrders) * 100 : 0;

    const qualityIssues = orders.reduce((count, po) => {
      const hasDiscrepancy = po.items.some(
        (item) =>
          po.status === 'received' &&
          Number(item.quantityReceived) !== Number(item.quantityOrdered),
      );
      return hasDiscrepancy ? count + 1 : count;
    }, 0);

    const sortedOrders = [...orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const lastOrderDate = sortedOrders.length > 0 ? sortedOrders[0].createdAt : null;

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
        typeof item.current_stock === 'number' ? item.current_stock : Number(item.current_stock);
      const minimumStock =
        typeof item.minimum_stock === 'number' ? item.minimum_stock : Number(item.minimum_stock);

      const suggestedQuantity = Math.max(minimumStock * 2 - currentStock, 1);

      const preferredSupplier = await this.findPreferredSupplier(item.product_id);

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

  async autoReorder(outletId: string, createdBy: string): Promise<AutoReorderResult> {
    const suggestions = await this.getReorderSuggestions(outletId);

    if (suggestions.length === 0) {
      return { purchaseOrders: [] };
    }

    const grouped = new Map<string, { supplierId: string; items: typeof suggestions }>();

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
          businessId: (await this.prisma.outlet.findUnique({ where: { id: outletId } }))
            ?.businessId,
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

  async findPurchaseOrdersByBusiness(businessId: string, status?: string, page = 1, limit = 100) {
    const where: Record<string, unknown> = {
      outlet: { businessId },
    };
    if (status) {
      where.status = status;
    }

    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;

    return this.prisma.purchaseOrder.findMany({
      where,
      include: { supplier: true, items: true },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }

  async approvePurchaseOrder(
    poId: string,
    approvedBy: string,
    notes?: string,
  ): Promise<PurchaseOrderResult> {
    const existing = await this.prisma.purchaseOrder.findUnique({ where: { id: poId } });
    if (!existing) throw new NotFoundException('Purchase order not found');
    if (existing.status !== 'draft') {
      throw new BadRequestException(
        `Cannot approve PO with status "${existing.status}". Only draft POs can be approved.`,
      );
    }

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
    const existing = await this.prisma.purchaseOrder.findUnique({ where: { id: poId } });
    if (!existing) throw new NotFoundException('Purchase order not found');
    if (existing.status !== 'draft' && existing.status !== 'ordered') {
      throw new BadRequestException(`Cannot reject PO with status "${existing.status}".`);
    }

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

  async getPendingPurchaseOrders(businessId: string): Promise<PendingPOEntry[]> {
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
          averageLeadTimeDays: Math.round((entry.totalDays / entry.count) * 10) / 10,
          orderCount: entry.count,
        });
      }
    }

    return trend;
  }

  /**
   * Get purchase history for a specific supplier scoped by business
   */
  async getPurchaseHistory(supplierId: string, businessId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, businessId },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const orders = await this.prisma.purchaseOrder.findMany({
      where: { supplierId, outlet: { businessId } },
      include: {
        items: true,
        outlet: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalPurchases = orders.reduce((sum, po) => sum + Number(po.totalAmount), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalPurchases / totalOrders : 0;

    const statusCounts = {
      pending: orders.filter((o) => o.status === 'draft').length,
      approved: orders.filter((o) => o.status === 'ordered').length,
      completed: orders.filter((o) => o.status === 'received').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
    };

    return {
      supplierName: supplier.name,
      summary: {
        totalPurchases: Math.round(totalPurchases * 100) / 100,
        totalOrders,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        statusCounts,
      },
      orders: orders.map((po) => ({
        id: po.id,
        orderNumber: po.poNumber,
        orderDate: po.createdAt,
        status: po.status,
        totalAmount: Number(po.totalAmount),
        outletName: po.outlet.name,
        itemCount: po.items.length,
        items: po.items.map((item) => ({
          productName: item.itemName,
          quantity: Number(item.quantityOrdered),
          unitPrice: Number(item.unitCost),
          subtotal: Number(item.subtotal),
        })),
      })),
    };
  }

  /**
   * Get payment status for a specific supplier scoped by business
   */
  async getPaymentStatus(supplierId: string, businessId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, businessId },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const orders = await this.prisma.purchaseOrder.findMany({
      where: { supplierId, outlet: { businessId } },
      orderBy: { createdAt: 'desc' },
    });

    const totalPurchases = orders.reduce((sum, po) => sum + Number(po.totalAmount), 0);
    // Consider 'received' orders as paid, 'ordered' or 'draft' as unpaid
    const paidOrders = orders.filter((o) => o.status === 'received');
    const unpaidOrders = orders.filter((o) => o.status === 'ordered' || o.status === 'draft');

    const totalPaid = paidOrders.reduce((sum, po) => sum + Number(po.totalAmount), 0);
    const totalDebt = unpaidOrders.reduce((sum, po) => sum + Number(po.totalAmount), 0);
    const paymentRate = totalPurchases > 0 ? (totalPaid / totalPurchases) * 100 : 100;

    const now = new Date();
    const overdueOrders = unpaidOrders.filter((o) => {
      if (!o.orderedAt) return false;
      const daysSinceOrder = (now.getTime() - o.orderedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceOrder > 30; // 30 days overdue threshold
    });

    const mapOrder = (po: (typeof orders)[0]) => ({
      id: po.id,
      orderNumber: po.poNumber,
      totalAmount: Number(po.totalAmount),
      paidAmount: po.status === 'received' ? Number(po.totalAmount) : 0,
      outstandingAmount: po.status === 'received' ? 0 : Number(po.totalAmount),
      orderDate: po.createdAt,
      dueDate: po.orderedAt ? new Date(po.orderedAt.getTime() + 30 * 24 * 60 * 60 * 1000) : null,
      daysOverdue: po.orderedAt
        ? Math.max(
            0,
            Math.floor((now.getTime() - po.orderedAt.getTime()) / (1000 * 60 * 60 * 24) - 30),
          )
        : 0,
    });

    return {
      supplierName: supplier.name,
      summary: {
        totalDebt: Math.round(totalDebt * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalPurchases: Math.round(totalPurchases * 100) / 100,
        paymentRate: Math.round(paymentRate * 10) / 10,
        unpaidOrdersCount: unpaidOrders.length,
        overdueOrdersCount: overdueOrders.length,
      },
      unpaidOrders: unpaidOrders.map(mapOrder),
      overdueOrders: overdueOrders.map(mapOrder),
    };
  }

  /**
   * Compare prices across suppliers for same products
   */
  async getSupplierComparison(businessId: string) {
    // Get all PO items grouped by product from active suppliers
    const poItems = await this.prisma.purchaseOrderItem.findMany({
      where: {
        productId: { not: null },
        purchaseOrder: {
          status: 'received',
          outlet: { businessId },
        },
      },
      include: {
        purchaseOrder: {
          include: { supplier: { select: { id: true, name: true } } },
        },
        product: { select: { id: true, name: true } },
      },
    });

    // Group by product, then by supplier
    const productMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        suppliers: Map<string, { prices: number[]; name: string; lastDate: Date }>;
      }
    >();

    for (const item of poItems) {
      if (!item.productId || !item.product) continue;
      const pid = item.productId;
      const sid = item.purchaseOrder.supplierId;

      if (!productMap.has(pid)) {
        productMap.set(pid, {
          productId: pid,
          productName: item.product.name,
          suppliers: new Map(),
        });
      }

      const pEntry = productMap.get(pid)!;
      if (!pEntry.suppliers.has(sid)) {
        pEntry.suppliers.set(sid, {
          prices: [],
          name: item.purchaseOrder.supplier.name,
          lastDate: item.purchaseOrder.createdAt,
        });
      }

      const sEntry = pEntry.suppliers.get(sid)!;
      sEntry.prices.push(Number(item.unitCost));
      if (item.purchaseOrder.createdAt > sEntry.lastDate) {
        sEntry.lastDate = item.purchaseOrder.createdAt;
      }
    }

    // Build comparisons (only products with multiple suppliers)
    const comparisons = [];
    for (const [, product] of productMap) {
      if (product.suppliers.size < 2) continue;

      const suppliers = [];
      for (const [supplierId, data] of product.suppliers) {
        const avgPrice = data.prices.reduce((a, b) => a + b, 0) / data.prices.length;
        suppliers.push({
          supplierId,
          supplierName: data.name,
          avgPrice: Math.round(avgPrice * 100) / 100,
          minPrice: Math.min(...data.prices),
          maxPrice: Math.max(...data.prices),
          orderCount: data.prices.length,
          lastOrderDate: data.lastDate,
        });
      }

      suppliers.sort((a, b) => a.avgPrice - b.avgPrice);
      const cheapest = suppliers[0];
      const mostExpensive = suppliers[suppliers.length - 1];
      const priceDiff = mostExpensive.avgPrice - cheapest.avgPrice;
      const savingsPct =
        mostExpensive.avgPrice > 0 ? (priceDiff / mostExpensive.avgPrice) * 100 : 0;

      comparisons.push({
        productId: product.productId,
        productName: product.productName,
        suppliers,
        cheapestSupplier: cheapest.supplierName,
        mostExpensiveSupplier: mostExpensive.avgPrice,
        priceDifference: Math.round(priceDiff * 100) / 100,
        savingsPercentage: Math.round(savingsPct * 10) / 10,
      });
    }

    comparisons.sort((a, b) => b.savingsPercentage - a.savingsPercentage);

    return {
      comparisons,
      totalProducts: comparisons.length,
    };
  }

  /**
   * Get reorder alerts with supplier info for all outlets in a business
   */
  async getReorderAlerts(businessId: string) {
    const lowStockItems = await this.prisma.stockLevel.findMany({
      where: {
        outlet: { businessId },
        productId: { not: null },
      },
      include: {
        product: { select: { id: true, name: true, sku: true, isActive: true } },
        outlet: { select: { name: true } },
      },
      take: 500,
    });

    // Filter to active low-stock items first
    const filteredItems = lowStockItems.filter(
      (sl) => sl.product && sl.product.isActive && Number(sl.quantity) < sl.lowStockAlert,
    );

    // Batch query: fetch the last received PO item for each product in one query (fixes N+1)
    const productIds = filteredItems
      .map((sl) => sl.productId)
      .filter((id): id is string => id !== null);

    const lastPOItems =
      productIds.length > 0
        ? await this.prisma.purchaseOrderItem.findMany({
            where: {
              productId: { in: productIds },
              purchaseOrder: { status: 'received' },
            },
            orderBy: { createdAt: 'desc' },
            distinct: ['productId'],
            include: {
              purchaseOrder: {
                select: { supplier: { select: { id: true, name: true } } },
              },
            },
          })
        : [];

    const poItemMap = new Map(lastPOItems.map((item) => [item.productId, item]));

    const alerts = [];
    for (const sl of filteredItems) {
      const currentStock = Number(sl.quantity);

      let recommendedSupplier = null;
      const lastPOItem = poItemMap.get(sl.productId);
      if (lastPOItem) {
        recommendedSupplier = {
          id: lastPOItem.purchaseOrder.supplier.id,
          name: lastPOItem.purchaseOrder.supplier.name,
          lastPrice: Number(lastPOItem.unitCost),
        };
      }

      alerts.push({
        productId: sl.productId,
        productName: sl.product!.name,
        sku: sl.product!.sku || '',
        outletName: sl.outlet.name,
        currentStock,
        recommendedSupplier,
        suggestedOrderQuantity: Math.max(sl.lowStockAlert * 2 - currentStock, 1),
      });
    }

    alerts.sort((a, b) => a.currentStock - b.currentStock);

    return {
      alerts,
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter((a) => a.currentStock <= 5).length,
    };
  }

  private async findPreferredSupplier(productId: string): Promise<string | null> {
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
