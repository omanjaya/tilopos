import { apiClient } from '../client';
import type {
  SalesReport,
  FinancialReport,
  DateRange,
  ProductReport,
  PaymentMethodReport,
  InventoryReport,
  KitchenReport,
  TableReport,
  StaffReport,
  AppointmentReport,
  DashboardSummary,
  DashboardItemSummary,
  OutletComparison,
  SalesSummaryReport,
  DiscountBreakdownReport,
  EmployeeSalesReport,
} from '@/types/report.types';

/**
 * Reject responses that are not a JSON object so contract drift surfaces as a
 * query error (ErrorState) instead of a report full of zeros.
 */
function asRecord(data: unknown, endpoint: string): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`Format respons ${endpoint} tidak valid`);
  }
  return data as Record<string, unknown>;
}

/** Number or null (cost/profit metrics are null for roles without cost access). */
function numOrNull(v: unknown): number | null {
  return v === null || v === undefined ? null : Number(v);
}

interface ReportParams {
  outletId: string;
  dateRange: DateRange;
  startDate?: string;
  endDate?: string;
}

export const reportsApi = {
  sales: (params: ReportParams) =>
    apiClient.get('/reports/sales', { params }).then((r) => {
      const d = asRecord(r.data, '/reports/sales');
      return {
        totalSales: Number(d.totalSales ?? 0),
        totalTransactions: Number(d.totalTransactions ?? 0),
        averageOrderValue: Number(d.averageOrderValue ?? 0),
        totalCustomers: Number(d.totalCustomers ?? 0),
        salesByDate: Array.isArray(d.salesByDate) ? d.salesByDate : [],
      } as SalesReport;
    }),

  /** GET /reports/financial — owner/manager only. totalRevenue = net sales excl. tax, net of refunds. */
  financial: (params: ReportParams) =>
    apiClient.get('/reports/financial', { params }).then((r) => {
      const d = asRecord(r.data, '/reports/financial');
      return {
        totalRevenue: Number(d.totalRevenue ?? 0),
        totalCost: Number(d.totalCost ?? 0),
        grossProfit: Number(d.grossProfit ?? 0),
        grossMargin: Number(d.grossMargin ?? 0),
      } as FinancialReport;
    }),

  products: (params: ReportParams) =>
    apiClient.get('/reports/products', { params }).then((r) => {
      const d = asRecord(r.data, '/reports/products');
      return {
        topProducts: Array.isArray(d.topProducts) ? d.topProducts : [],
        totalProducts: Number(d.totalProducts ?? 0),
        totalQuantitySold: Number(d.totalQuantitySold ?? 0),
      } as ProductReport;
    }),

  paymentMethods: (params: ReportParams) =>
    apiClient.get('/reports/payment-methods', { params }).then((r) => {
      const d = asRecord(r.data, '/reports/payment-methods');
      return {
        methods: Array.isArray(d.methods) ? d.methods : [],
        totalAmount: Number(d.totalAmount ?? 0),
        totalTransactions: Number(d.totalTransactions ?? 0),
      } as PaymentMethodReport;
    }),

  // Inventory Report (Retail) — current stock snapshot, date range is ignored by the backend
  inventory: (params: Pick<ReportParams, 'outletId'>) =>
    apiClient.get('/reports/inventory', { params: { outletId: params.outletId } }).then((r) => {
      const d = asRecord(r.data, '/reports/inventory');
      return {
        totalItems: Number(d.totalItems ?? 0),
        lowStockItems: Number(d.lowStockItems ?? 0),
        outOfStockItems: Number(d.outOfStockItems ?? 0),
        totalValue: numOrNull(d.totalValue),
        items: Array.isArray(d.items) ? d.items : [],
      } as InventoryReport;
    }),

  // Kitchen Report (F&B)
  kitchen: (params: ReportParams) =>
    apiClient.get('/reports/kitchen', { params }).then((r) => {
      const d = asRecord(r.data, '/reports/kitchen');
      const summary = asRecord(d.summary, '/reports/kitchen');
      return {
        period: (d.period ?? { start: '', end: '' }) as KitchenReport['period'],
        summary: {
          totalOrders: Number(summary.totalOrders ?? 0),
          completedOrders: Number(summary.completedOrders ?? 0),
          avgPrepTimeMinutes: Number(summary.avgPrepTimeMinutes ?? 0),
          fastestPrepMinutes: Number(summary.fastestPrepMinutes ?? 0),
          slowestPrepMinutes: Number(summary.slowestPrepMinutes ?? 0),
          ordersPerHour: Number(summary.ordersPerHour ?? 0),
          slaTargetMinutes: Number(summary.slaTargetMinutes ?? 0),
          slaAdherenceRate: Number(summary.slaAdherenceRate ?? 0),
        },
        peakHours: Array.isArray(d.peakHours) ? d.peakHours : [],
        itemsPreparedByProduct: Array.isArray(d.itemsPreparedByProduct) ? d.itemsPreparedByProduct : [],
        stations: Array.isArray(d.stations) ? d.stations : [],
        orderStatusBreakdown: Array.isArray(d.orderStatusBreakdown) ? d.orderStatusBreakdown : [],
      } as KitchenReport;
    }),

  // Table Report (F&B)
  table: (params: ReportParams) =>
    apiClient.get<TableReport>('/reports/table', { params }).then((r) => r.data),

  // Staff Report (Service)
  staff: (params: ReportParams) =>
    apiClient.get<StaffReport>('/reports/staff', { params }).then((r) => r.data),

  // Appointment Report (Service)
  appointment: (params: ReportParams) =>
    apiClient.get<AppointmentReport>('/reports/appointment', { params }).then((r) => r.data),

  // Dashboard (Moka-style)
  dashboardSummary: (params: { outletId: string; startDate: string; endDate: string }) =>
    apiClient.get('/reports/dashboard/summary', { params }).then((r) => {
      const d = asRecord(r.data, '/reports/dashboard/summary');
      return {
        grossSales: Number(d.grossSales ?? 0),
        netSales: Number(d.netSales ?? 0),
        grossProfit: numOrNull(d.grossProfit),
        transactions: Number(d.transactions ?? 0),
        averageSalePerTransaction: Number(d.averageSalePerTransaction ?? 0),
        grossMargin: numOrNull(d.grossMargin),
        salesByDayOfWeek: Array.isArray(d.salesByDayOfWeek) ? d.salesByDayOfWeek : [],
        salesByHour: Array.isArray(d.salesByHour) ? d.salesByHour : [],
      } as DashboardSummary;
    }),

  dashboardItems: (params: { outletId: string; startDate: string; endDate: string }) =>
    apiClient.get('/reports/dashboard/items', { params }).then((r) => {
      const d = asRecord(r.data, '/reports/dashboard/items');
      return {
        topItems: Array.isArray(d.topItems) ? d.topItems : [],
        categoryByVolume: Array.isArray(d.categoryByVolume) ? d.categoryByVolume : [],
        categoryBySales: Array.isArray(d.categoryBySales) ? d.categoryBySales : [],
        topItemsByCategory: Array.isArray(d.topItemsByCategory) ? d.topItemsByCategory : [],
      } as DashboardItemSummary;
    }),

  outletComparison: (params: { startDate: string; endDate: string }) =>
    apiClient.get('/reports/dashboard/outlet-comparison', { params }).then((r) => {
      const d = asRecord(r.data, '/reports/dashboard/outlet-comparison');
      return {
        outlets: Array.isArray(d.outlets) ? d.outlets : [],
        totals: d.totals ?? { grossSales: 0, netSales: 0, transactions: 0 },
      } as OutletComparison;
    }),

  // Sales Report Detail
  salesSummary: (params: { outletId: string; startDate: string; endDate: string }) =>
    apiClient.get('/reports/sales/summary', { params }).then((r) => {
      const d = asRecord(r.data, '/reports/sales/summary');
      return {
        grossSales: Number(d.grossSales ?? 0),
        discountAmount: Number(d.discountAmount ?? 0),
        refundAmount: Number(d.refundAmount ?? 0),
        netSales: Number(d.netSales ?? 0),
        taxAmount: Number(d.taxAmount ?? 0),
        serviceCharge: Number(d.serviceCharge ?? 0),
        roundingAmount: Number(d.roundingAmount ?? 0),
        totalCollected: Number(d.totalCollected ?? 0),
        totalTransactions: Number(d.totalTransactions ?? 0),
        refundTransactions: Number(d.refundTransactions ?? 0),
        averageOrderValue: Number(d.averageOrderValue ?? 0),
      } as SalesSummaryReport;
    }),

  discountBreakdown: (params: { outletId: string; startDate: string; endDate: string }) =>
    apiClient.get('/reports/sales/discount-breakdown', { params }).then((r) => {
      const d = asRecord(r.data, '/reports/sales/discount-breakdown');
      return {
        totalDiscount: Number(d.totalDiscount ?? 0),
        transactionLevelDiscount: Number(d.transactionLevelDiscount ?? 0),
        itemLevelDiscount: Number(d.itemLevelDiscount ?? 0),
        transactionsWithDiscount: Number(d.transactionsWithDiscount ?? 0),
        transactionsWithoutDiscount: Number(d.transactionsWithoutDiscount ?? 0),
        promotionBreakdown: Array.isArray(d.promotionBreakdown) ? d.promotionBreakdown : [],
      } as DiscountBreakdownReport;
    }),

  employeeSales: (params: { outletId: string; startDate: string; endDate: string }) =>
    apiClient.get('/reports/employees', { params }).then((r) => {
      const d = asRecord(r.data, '/reports/employees');
      return {
        period: d.period ?? { start: '', end: '' },
        employees: Array.isArray(d.employees) ? d.employees : [],
        summary: d.summary ?? { totalEmployees: 0, totalSales: 0, totalTransactions: 0, totalVoids: 0, totalRefunds: 0 },
      } as EmployeeSalesReport;
    }),
};

