import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

// ============================================================================
// Interfaces
// ============================================================================

export type ReportMetric = 'sales' | 'items' | 'payments' | 'customers' | 'orders' | 'refunds' | 'discounts' | 'tax';

export type ReportDimension = 'date' | 'product' | 'category' | 'employee' | 'outlet' | 'payment_method' | 'order_type' | 'hour';

export interface CustomReportConfig {
  metrics: ReportMetric[];
  dimensions: ReportDimension[];
  filters?: {
    outletId?: string;
    employeeId?: string;
    categoryId?: string;
    productId?: string;
    paymentMethod?: string;
    orderType?: string;
  };
  startDate: string;
  endDate: string;
}

export interface CustomReportResult {
  config: CustomReportConfig;
  data: Record<string, unknown>[];
  totals: Record<string, number>;
  generatedAt: string;
}

export interface AvailableMetricsResult {
  metrics: { key: ReportMetric; label: string; description: string }[];
  dimensions: { key: ReportDimension; label: string; description: string }[];
}

export interface ReportTemplate {
  id: string;
  businessId: string;
  name: string;
  config: CustomReportConfig;
  createdAt: Date;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  /** In-memory template store (in production, use a DB table) */
  private readonly templates = new Map<string, ReportTemplate>();
  private templateCounter = 0;

  constructor(private readonly prisma: PrismaService) {}

  // ========================================================================
  // CUSTOM REPORT BUILDER
  // ========================================================================

  /**
   * Generates custom report based on user-defined configuration.
   */
  async buildCustomReport(
    businessId: string,
    config: CustomReportConfig,
  ): Promise<CustomReportResult> {
    if (!config.metrics || config.metrics.length === 0) {
      throw new BadRequestException('At least one metric is required');
    }

    if (!config.dimensions || config.dimensions.length === 0) {
      throw new BadRequestException('At least one dimension is required');
    }

    const startDate = new Date(config.startDate);
    const endDate = new Date(config.endDate);

    // Get outlet IDs for this business
    const outlets = await this.prisma.outlet.findMany({
      where: { businessId },
      select: { id: true },
    });
    const outletIds = outlets.map((o) => o.id);

    if (outletIds.length === 0) {
      return {
        config,
        data: [],
        totals: {},
        generatedAt: new Date().toISOString(),
      };
    }

    // Build where clause
    const transactionWhere: Record<string, unknown> = {
      outletId: config.filters?.outletId
        ? config.filters.outletId
        : { in: outletIds },
      createdAt: { gte: startDate, lte: endDate },
      transactionType: 'sale',
      status: 'completed',
    };

    if (config.filters?.employeeId) {
      transactionWhere['employeeId'] = config.filters.employeeId;
    }

    // Fetch transactions with items and payments
    const transactions = await this.prisma.transaction.findMany({
      where: transactionWhere,
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, categoryId: true, category: { select: { name: true } } },
            },
          },
        },
        payments: true,
        employee: { select: { id: true, name: true } },
        outlet: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Apply additional filters
    let filteredTransactions = transactions;

    if (config.filters?.categoryId) {
      filteredTransactions = filteredTransactions.filter((tx) =>
        tx.items.some((item) => item.product?.categoryId === config.filters?.categoryId),
      );
    }

    if (config.filters?.productId) {
      filteredTransactions = filteredTransactions.filter((tx) =>
        tx.items.some((item) => item.productId === config.filters?.productId),
      );
    }

    if (config.filters?.paymentMethod) {
      filteredTransactions = filteredTransactions.filter((tx) =>
        tx.payments.some((p) => p.paymentMethod === config.filters?.paymentMethod),
      );
    }

    if (config.filters?.orderType) {
      filteredTransactions = filteredTransactions.filter(
        (tx) => tx.orderType === config.filters?.orderType,
      );
    }

    // Group data by dimensions
    const groupedData = new Map<string, Record<string, unknown>>();

    for (const tx of filteredTransactions) {
      const dimensionKey = this.buildDimensionKey(tx, config.dimensions);
      const existing = groupedData.get(dimensionKey) || this.initRow(tx, config.dimensions);

      // Accumulate metrics
      if (config.metrics.includes('sales')) {
        (existing['sales'] as number) += Number(tx.grandTotal);
      }
      if (config.metrics.includes('items')) {
        (existing['items'] as number) += tx.items.reduce(
          (sum, item) => sum + Number(item.quantity),
          0,
        );
      }
      if (config.metrics.includes('payments')) {
        (existing['payments'] as number) += tx.payments.length;
      }
      if (config.metrics.includes('customers')) {
        if (tx.customerId) {
          const customerSet = (existing['_customerIds'] as Set<string>) || new Set<string>();
          customerSet.add(tx.customerId);
          existing['_customerIds'] = customerSet;
          existing['customers'] = customerSet.size;
        }
      }
      if (config.metrics.includes('orders')) {
        (existing['orders'] as number) += 1;
      }
      if (config.metrics.includes('discounts')) {
        (existing['discounts'] as number) += Number(tx.discountAmount);
      }
      if (config.metrics.includes('tax')) {
        (existing['tax'] as number) += Number(tx.taxAmount);
      }

      groupedData.set(dimensionKey, existing);
    }

    // Handle refunds separately if requested
    if (config.metrics.includes('refunds')) {
      const refundWhere = {
        ...transactionWhere,
        transactionType: 'refund' as const,
      };

      const refundTransactions = await this.prisma.transaction.findMany({
        where: refundWhere,
        include: {
          employee: { select: { id: true, name: true } },
          outlet: { select: { id: true, name: true } },
        },
      });

      for (const tx of refundTransactions) {
        const dimensionKey = this.buildDimensionKey(tx, config.dimensions);
        const existing = groupedData.get(dimensionKey) || this.initRow(tx, config.dimensions);
        (existing['refunds'] as number) += Math.abs(Number(tx.grandTotal));
        groupedData.set(dimensionKey, existing);
      }
    }

    // Build result data, strip internal fields
    const data = Array.from(groupedData.values()).map((row) => {
      const cleanRow: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        if (!key.startsWith('_')) {
          if (typeof value === 'number') {
            cleanRow[key] = Math.round(value * 100) / 100;
          } else {
            cleanRow[key] = value;
          }
        }
      }
      return cleanRow;
    });

    // Calculate totals
    const totals: Record<string, number> = {};
    for (const metric of config.metrics) {
      totals[metric] = data.reduce((sum, row) => sum + (Number(row[metric]) || 0), 0);
      totals[metric] = Math.round(totals[metric] * 100) / 100;
    }

    this.logger.log(
      `Custom report built for business ${businessId}: ${data.length} rows, metrics=[${config.metrics.join(',')}], dimensions=[${config.dimensions.join(',')}]`,
    );

    return {
      config,
      data,
      totals,
      generatedAt: new Date().toISOString(),
    };
  }

  // ========================================================================
  // AVAILABLE METRICS
  // ========================================================================

  /**
   * Returns list of available metrics and dimensions for the report builder.
   */
  getAvailableMetrics(): AvailableMetricsResult {
    return {
      metrics: [
        { key: 'sales', label: 'Total Sales', description: 'Sum of grand total from completed transactions' },
        { key: 'items', label: 'Items Sold', description: 'Total quantity of items sold' },
        { key: 'payments', label: 'Payment Count', description: 'Number of payments processed' },
        { key: 'customers', label: 'Unique Customers', description: 'Count of unique customers' },
        { key: 'orders', label: 'Order Count', description: 'Number of transactions/orders' },
        { key: 'refunds', label: 'Refunds', description: 'Total refund amount' },
        { key: 'discounts', label: 'Discounts Given', description: 'Total discount amount applied' },
        { key: 'tax', label: 'Tax Collected', description: 'Total tax amount collected' },
      ],
      dimensions: [
        { key: 'date', label: 'Date', description: 'Group by calendar date (YYYY-MM-DD)' },
        { key: 'product', label: 'Product', description: 'Group by product name' },
        { key: 'category', label: 'Category', description: 'Group by product category' },
        { key: 'employee', label: 'Employee', description: 'Group by employee who processed the transaction' },
        { key: 'outlet', label: 'Outlet', description: 'Group by outlet/branch' },
        { key: 'payment_method', label: 'Payment Method', description: 'Group by payment method (cash, card, QRIS, etc.)' },
        { key: 'order_type', label: 'Order Type', description: 'Group by order type (dine-in, takeaway, delivery)' },
        { key: 'hour', label: 'Hour of Day', description: 'Group by hour of the day (0-23)' },
      ],
    };
  }

  // ========================================================================
  // REPORT TEMPLATES
  // ========================================================================

  /**
   * Saves report configuration as a named template.
   */
  async saveReportTemplate(
    businessId: string,
    name: string,
    config: CustomReportConfig,
  ): Promise<ReportTemplate> {
    this.templateCounter++;
    const id = `template_${businessId}_${this.templateCounter}`;

    const template: ReportTemplate = {
      id,
      businessId,
      name,
      config,
      createdAt: new Date(),
    };

    this.templates.set(id, template);

    this.logger.log(`Report template saved: ${name} (${id}) for business ${businessId}`);

    return template;
  }

  /**
   * List saved report templates for the business.
   */
  async getSavedTemplates(businessId: string): Promise<ReportTemplate[]> {
    const templates: ReportTemplate[] = [];
    for (const template of this.templates.values()) {
      if (template.businessId === businessId) {
        templates.push(template);
      }
    }
    return templates.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  // ========================================================================
  // HELPERS
  // ========================================================================

  private buildDimensionKey(
    tx: {
      createdAt: Date;
      orderType: string;
      employee: { id: string; name: string } | null;
      outlet: { id: string; name: string };
      items?: { product: { id: string; name: string; categoryId: string | null; category: { name: string } | null } | null }[];
      payments?: { paymentMethod: string }[];
    },
    dimensions: ReportDimension[],
  ): string {
    const parts: string[] = [];

    for (const dim of dimensions) {
      switch (dim) {
        case 'date':
          parts.push(tx.createdAt.toISOString().split('T')[0]);
          break;
        case 'hour':
          parts.push(String(tx.createdAt.getHours()));
          break;
        case 'employee':
          parts.push(tx.employee?.id ?? 'unassigned');
          break;
        case 'outlet':
          parts.push(tx.outlet.id);
          break;
        case 'order_type':
          parts.push(tx.orderType);
          break;
        case 'payment_method':
          parts.push(tx.payments?.[0]?.paymentMethod ?? 'unknown');
          break;
        case 'product':
          parts.push(tx.items?.[0]?.product?.id ?? 'unknown');
          break;
        case 'category':
          parts.push(tx.items?.[0]?.product?.categoryId ?? 'uncategorized');
          break;
      }
    }

    return parts.join('|');
  }

  private initRow(
    tx: {
      createdAt: Date;
      orderType: string;
      employee: { id: string; name: string } | null;
      outlet: { id: string; name: string };
      items?: { product: { id: string; name: string; categoryId: string | null; category: { name: string } | null } | null }[];
      payments?: { paymentMethod: string }[];
    },
    dimensions: ReportDimension[],
  ): Record<string, unknown> {
    const row: Record<string, unknown> = {
      sales: 0,
      items: 0,
      payments: 0,
      customers: 0,
      orders: 0,
      refunds: 0,
      discounts: 0,
      tax: 0,
    };

    for (const dim of dimensions) {
      switch (dim) {
        case 'date':
          row['date'] = tx.createdAt.toISOString().split('T')[0];
          break;
        case 'hour':
          row['hour'] = tx.createdAt.getHours();
          break;
        case 'employee':
          row['employeeId'] = tx.employee?.id ?? null;
          row['employeeName'] = tx.employee?.name ?? 'Unassigned';
          break;
        case 'outlet':
          row['outletId'] = tx.outlet.id;
          row['outletName'] = tx.outlet.name;
          break;
        case 'order_type':
          row['orderType'] = tx.orderType;
          break;
        case 'payment_method':
          row['paymentMethod'] = tx.payments?.[0]?.paymentMethod ?? 'unknown';
          break;
        case 'product':
          row['productId'] = tx.items?.[0]?.product?.id ?? null;
          row['productName'] = tx.items?.[0]?.product?.name ?? 'Unknown';
          break;
        case 'category':
          row['categoryId'] = tx.items?.[0]?.product?.categoryId ?? null;
          row['categoryName'] = tx.items?.[0]?.product?.category?.name ?? 'Uncategorized';
          break;
      }
    }

    return row;
  }
}
