import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { TenantAccessService } from '@shared/tenant';
import { businessHour } from '@shared/utils/business-time';
import { businessDateString, getDateRange } from './utils/date-range.util';

/** Hard cap on transactions a single custom report may scan (R13). */
export const MAX_CUSTOM_REPORT_TRANSACTIONS = 20_000;
/** Max saved templates per business. */
export const MAX_REPORT_TEMPLATES = 100;

// ============================================================================
// Interfaces
// ============================================================================

export type ReportMetric =
  | 'sales'
  | 'items'
  | 'payments'
  | 'customers'
  | 'orders'
  | 'refunds'
  | 'discounts'
  | 'tax';

export type ReportDimension =
  | 'date'
  | 'product'
  | 'category'
  | 'employee'
  | 'outlet'
  | 'payment_method'
  | 'order_type'
  | 'hour';

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

export interface ReportTemplateDto {
  id: string;
  businessId: string;
  name: string;
  config: CustomReportConfig;
  createdAt: Date;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantAccessService,
  ) {}

  // ========================================================================
  // CUSTOM REPORT BUILDER
  // ========================================================================

  /**
   * Generates custom report based on user-defined configuration.
   */
  async buildCustomReport(user: AuthUser, config: CustomReportConfig): Promise<CustomReportResult> {
    const businessId = user.businessId;
    if (!config.metrics || config.metrics.length === 0) {
      throw new BadRequestException('At least one metric is required');
    }

    if (!config.dimensions || config.dimensions.length === 0) {
      throw new BadRequestException('At least one dimension is required');
    }

    // WIB business days, inclusive end day, max range enforced (R13/R14)
    const { start: startDate, end: endDate } = getDateRange(
      undefined,
      config.startDate,
      config.endDate,
    );

    // Outlet scope: a requested outlet must belong to the caller's business (R3)
    const outletIds = await this.tenant.resolveOutletIds(user, config.filters?.outletId);

    if (outletIds.length === 0) {
      return {
        config,
        data: [],
        totals: {},
        generatedAt: new Date().toISOString(),
      };
    }

    // Filters are pushed into SQL instead of filtering in memory
    const transactionWhere: Prisma.TransactionWhereInput = {
      outletId: { in: outletIds },
      createdAt: { gte: startDate, lte: endDate },
      transactionType: 'sale',
      status: 'completed',
      ...(config.filters?.employeeId ? { employeeId: config.filters.employeeId } : {}),
      ...(config.filters?.orderType
        ? { orderType: config.filters.orderType as Prisma.TransactionWhereInput['orderType'] }
        : {}),
      ...(config.filters?.paymentMethod
        ? {
            payments: {
              some: {
                paymentMethod: config.filters
                  .paymentMethod as Prisma.PaymentWhereInput['paymentMethod'],
              },
            },
          }
        : {}),
      ...(config.filters?.categoryId || config.filters?.productId
        ? {
            items: {
              some: {
                ...(config.filters.productId ? { productId: config.filters.productId } : {}),
                ...(config.filters.categoryId
                  ? { product: { categoryId: config.filters.categoryId } }
                  : {}),
              },
            },
          }
        : {}),
    };

    const matching = await this.prisma.transaction.count({ where: transactionWhere });
    if (matching > MAX_CUSTOM_REPORT_TRANSACTIONS) {
      throw new BadRequestException(
        `Report covers ${matching} transactions (max ${MAX_CUSTOM_REPORT_TRANSACTIONS}); narrow the date range or filters`,
      );
    }

    // Fetch transactions with items and payments
    const transactions = await this.prisma.transaction.findMany({
      where: transactionWhere,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                categoryId: true,
                category: { select: { name: true } },
              },
            },
          },
        },
        payments: { select: { paymentMethod: true } },
        employee: { select: { id: true, name: true } },
        outlet: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: MAX_CUSTOM_REPORT_TRANSACTIONS,
    });

    const filteredTransactions = transactions;

    // Group data by dimensions
    const groupedData = new Map<string, Record<string, unknown>>();

    // Check if dimensions require per-item or per-payment expansion
    const needsItemExpansion = config.dimensions.some((d) => d === 'product' || d === 'category');
    const needsPaymentExpansion = config.dimensions.includes('payment_method');

    for (const tx of filteredTransactions) {
      // Determine expansion rows: when grouping by product/category, create one row per item;
      // when grouping by payment_method, create one row per payment; otherwise one row per tx.
      const itemSlices =
        needsItemExpansion && tx.items.length > 0
          ? tx.items.map((item) => ({ item, items: [item] }))
          : [{ item: tx.items[0] ?? null, items: tx.items }];

      const paymentSlices =
        needsPaymentExpansion && tx.payments.length > 0
          ? tx.payments.map((payment) => ({ payment, payments: [payment] }))
          : [{ payment: tx.payments[0] ?? null, payments: tx.payments }];

      for (const itemSlice of itemSlices) {
        for (const paymentSlice of paymentSlices) {
          const expandedTx = {
            ...tx,
            _currentItem: itemSlice.item,
            _currentPayment: paymentSlice.payment,
          };
          const dimensionKey = this.buildDimensionKey(expandedTx, config.dimensions);
          const existing =
            groupedData.get(dimensionKey) || this.initRow(expandedTx, config.dimensions);

          // Accumulate metrics - when expanding, distribute per-slice
          if (config.metrics.includes('sales')) {
            if (needsItemExpansion) {
              (existing['sales'] as number) += Number(itemSlice.item?.subtotal ?? 0);
            } else if (!needsPaymentExpansion || paymentSlice === paymentSlices[0]) {
              (existing['sales'] as number) += Number(tx.grandTotal);
            }
          }
          if (config.metrics.includes('items')) {
            if (needsItemExpansion) {
              (existing['items'] as number) += Number(itemSlice.item?.quantity ?? 0);
            } else {
              (existing['items'] as number) += tx.items.reduce(
                (sum, item) => sum + Number(item.quantity),
                0,
              );
            }
          }
          if (config.metrics.includes('payments')) {
            (existing['payments'] as number) += paymentSlice.payments.length;
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
            // Only count order once per transaction, not per expansion
            const orderSet = (existing['_orderIds'] as Set<string>) || new Set<string>();
            if (!orderSet.has(tx.id)) {
              orderSet.add(tx.id);
              existing['_orderIds'] = orderSet;
              (existing['orders'] as number) += 1;
            }
          }
          if (config.metrics.includes('discounts')) {
            if (needsItemExpansion) {
              (existing['discounts'] as number) += Number(itemSlice.item?.discountAmount ?? 0);
            } else if (!needsPaymentExpansion || paymentSlice === paymentSlices[0]) {
              (existing['discounts'] as number) += Number(tx.discountAmount);
            }
          }
          if (config.metrics.includes('tax')) {
            if (
              !needsItemExpansion &&
              (!needsPaymentExpansion || paymentSlice === paymentSlices[0])
            ) {
              (existing['tax'] as number) += Number(tx.taxAmount);
            }
          }

          groupedData.set(dimensionKey, existing);
        }
      }
    }

    // Handle refunds separately if requested
    if (config.metrics.includes('refunds')) {
      const refundWhere: Prisma.TransactionWhereInput = {
        outletId: { in: outletIds },
        createdAt: { gte: startDate, lte: endDate },
        transactionType: 'refund',
        status: 'completed',
        ...(config.filters?.employeeId ? { employeeId: config.filters.employeeId } : {}),
      };

      const refundTransactions = await this.prisma.transaction.findMany({
        where: refundWhere,
        take: MAX_CUSTOM_REPORT_TRANSACTIONS,
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
        {
          key: 'sales',
          label: 'Total Sales',
          description: 'Sum of grand total from completed transactions',
        },
        { key: 'items', label: 'Items Sold', description: 'Total quantity of items sold' },
        { key: 'payments', label: 'Payment Count', description: 'Number of payments processed' },
        { key: 'customers', label: 'Unique Customers', description: 'Count of unique customers' },
        { key: 'orders', label: 'Order Count', description: 'Number of transactions/orders' },
        { key: 'refunds', label: 'Refunds', description: 'Total refund amount' },
        {
          key: 'discounts',
          label: 'Discounts Given',
          description: 'Total discount amount applied',
        },
        { key: 'tax', label: 'Tax Collected', description: 'Total tax amount collected' },
      ],
      dimensions: [
        { key: 'date', label: 'Date', description: 'Group by calendar date (YYYY-MM-DD)' },
        { key: 'product', label: 'Product', description: 'Group by product name' },
        { key: 'category', label: 'Category', description: 'Group by product category' },
        {
          key: 'employee',
          label: 'Employee',
          description: 'Group by employee who processed the transaction',
        },
        { key: 'outlet', label: 'Outlet', description: 'Group by outlet/branch' },
        {
          key: 'payment_method',
          label: 'Payment Method',
          description: 'Group by payment method (cash, card, QRIS, etc.)',
        },
        {
          key: 'order_type',
          label: 'Order Type',
          description: 'Group by order type (dine-in, takeaway, delivery)',
        },
        { key: 'hour', label: 'Hour of Day', description: 'Group by hour of the day (0-23)' },
      ],
    };
  }

  // ========================================================================
  // REPORT TEMPLATES
  // ========================================================================

  /**
   * Saves report configuration as a named template (persisted in DB).
   */
  async saveReportTemplate(
    businessId: string,
    name: string,
    config: CustomReportConfig,
  ): Promise<ReportTemplateDto> {
    const existing = await this.prisma.reportTemplate.count({ where: { businessId } });
    if (existing >= MAX_REPORT_TEMPLATES) {
      throw new BadRequestException(`Maximum of ${MAX_REPORT_TEMPLATES} report templates reached`);
    }
    const template = await this.prisma.reportTemplate.create({
      data: {
        businessId,
        name,
        config: JSON.parse(JSON.stringify(config)),
      },
    });

    this.logger.log(`Report template saved: ${name} (${template.id}) for business ${businessId}`);

    return {
      id: template.id,
      businessId: template.businessId,
      name: template.name,
      config: template.config as unknown as CustomReportConfig,
      createdAt: template.createdAt,
    };
  }

  /**
   * List saved report templates for the business (from DB).
   */
  async getSavedTemplates(businessId: string): Promise<ReportTemplateDto[]> {
    const templates = await this.prisma.reportTemplate.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: MAX_REPORT_TEMPLATES,
    });

    return templates.map((t) => ({
      id: t.id,
      businessId: t.businessId,
      name: t.name,
      config: t.config as unknown as CustomReportConfig,
      createdAt: t.createdAt,
    }));
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
      items?: {
        product: {
          id: string;
          name: string;
          categoryId: string | null;
          category: { name: string } | null;
        } | null;
      }[];
      payments?: { paymentMethod: string }[];
      _currentItem?: {
        product: {
          id: string;
          name: string;
          categoryId: string | null;
          category: { name: string } | null;
        } | null;
      } | null;
      _currentPayment?: { paymentMethod: string } | null;
    },
    dimensions: ReportDimension[],
  ): string {
    const parts: string[] = [];

    for (const dim of dimensions) {
      switch (dim) {
        case 'date':
          parts.push(businessDateString(tx.createdAt));
          break;
        case 'hour':
          parts.push(String(businessHour(tx.createdAt)));
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
          parts.push(
            tx._currentPayment?.paymentMethod ?? tx.payments?.[0]?.paymentMethod ?? 'unknown',
          );
          break;
        case 'product':
          parts.push(tx._currentItem?.product?.id ?? tx.items?.[0]?.product?.id ?? 'unknown');
          break;
        case 'category':
          parts.push(
            tx._currentItem?.product?.categoryId ??
              tx.items?.[0]?.product?.categoryId ??
              'uncategorized',
          );
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
      items?: {
        product: {
          id: string;
          name: string;
          categoryId: string | null;
          category: { name: string } | null;
        } | null;
      }[];
      payments?: { paymentMethod: string }[];
      _currentItem?: {
        product: {
          id: string;
          name: string;
          categoryId: string | null;
          category: { name: string } | null;
        } | null;
      } | null;
      _currentPayment?: { paymentMethod: string } | null;
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
          row['date'] = businessDateString(tx.createdAt);
          break;
        case 'hour':
          row['hour'] = businessHour(tx.createdAt);
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
          row['paymentMethod'] =
            tx._currentPayment?.paymentMethod ?? tx.payments?.[0]?.paymentMethod ?? 'unknown';
          break;
        case 'product':
          row['productId'] = tx._currentItem?.product?.id ?? tx.items?.[0]?.product?.id ?? null;
          row['productName'] =
            tx._currentItem?.product?.name ?? tx.items?.[0]?.product?.name ?? 'Unknown';
          break;
        case 'category':
          row['categoryId'] =
            tx._currentItem?.product?.categoryId ?? tx.items?.[0]?.product?.categoryId ?? null;
          row['categoryName'] =
            tx._currentItem?.product?.category?.name ??
            tx.items?.[0]?.product?.category?.name ??
            'Uncategorized';
          break;
      }
    }

    return row;
  }
}
