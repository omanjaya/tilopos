import { apiClient } from '../client';
import type {
  SalesReport,
  FinancialReport,
  CustomerReport,
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
import { toast } from '@/lib/toast-utils';

interface ReportParams {
  outletId: string;
  dateRange: DateRange;
  startDate?: string;
  endDate?: string;
}

export const reportsApi = {
  sales: (params: ReportParams) =>
    apiClient.get('/reports/sales', { params }).then((r) => {
      const d = r.data as unknown as Record<string, unknown>;
      return {
        totalSales: Number(d.totalSales ?? 0),
        totalTransactions: Number(d.totalTransactions ?? 0),
        averageOrderValue: Number(d.averageOrderValue ?? 0),
        totalCustomers: Number(d.totalCustomers ?? 0),
        salesByDate: Array.isArray(d.salesByDate) ? d.salesByDate : [],
      } as SalesReport;
    }),

  financial: (params: ReportParams) =>
    apiClient.get('/reports/financial', { params }).then((r) => {
      const d = r.data as unknown as Record<string, unknown>;
      return {
        totalRevenue: Number(d.totalRevenue ?? 0),
        totalCost: Number(d.totalCost ?? 0),
        grossProfit: Number(d.grossProfit ?? 0),
        grossMargin: Number(d.grossMargin ?? 0),
      } as FinancialReport;
    }),

  customers: (params: ReportParams) =>
    apiClient.get('/reports/customers', { params }).then((r) => {
      const d = r.data as unknown as Record<string, unknown>;
      return {
        totalCustomers: Number(d.totalCustomers ?? 0),
        newCustomers: Number(d.newCustomers ?? 0),
        returningCustomers: Number(d.returningCustomers ?? 0),
        topCustomers: Array.isArray(d.topCustomers) ? d.topCustomers : [],
      } as CustomerReport;
    }),

  products: (params: ReportParams) =>
    apiClient.get('/reports/products', { params }).then((r) => {
      const d = r.data as unknown as Record<string, unknown>;
      return {
        topProducts: Array.isArray(d.topProducts) ? d.topProducts : [],
        totalProducts: Number(d.totalProducts ?? 0),
        totalQuantitySold: Number(d.totalQuantitySold ?? 0),
      } as ProductReport;
    }).catch(() => {
      toast.error({ title: 'Failed to load product report' });
      return {
        topProducts: [],
        totalProducts: 0,
        totalQuantitySold: 0,
      } as ProductReport;
    }),

  paymentMethods: (params: ReportParams) =>
    apiClient.get('/reports/payment-methods', { params }).then((r) => {
      const d = r.data as unknown as Record<string, unknown>;
      return {
        methods: Array.isArray(d.methods) ? d.methods : [],
        totalAmount: Number(d.totalAmount ?? 0),
        totalTransactions: Number(d.totalTransactions ?? 0),
      } as PaymentMethodReport;
    }).catch(() => {
      toast.error({ title: 'Failed to load payment methods report' });
      return {
        methods: [],
        totalAmount: 0,
        totalTransactions: 0,
      } as PaymentMethodReport;
    }),

  // Inventory Report (Retail)
  inventory: (params: ReportParams) =>
    apiClient.get<InventoryReport>('/reports/inventory', { params }).then((r) => r.data),

  // Kitchen Report (F&B)
  kitchen: (params: ReportParams) =>
    apiClient.get<KitchenReport>('/reports/kitchen', { params }).then((r) => r.data),

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
      const d = r.data as unknown as Record<string, unknown>;
      return {
        grossSales: Number(d.grossSales ?? 0),
        netSales: Number(d.netSales ?? 0),
        grossProfit: Number(d.grossProfit ?? 0),
        transactions: Number(d.transactions ?? 0),
        averageSalePerTransaction: Number(d.averageSalePerTransaction ?? 0),
        grossMargin: Number(d.grossMargin ?? 0),
        salesByDayOfWeek: Array.isArray(d.salesByDayOfWeek) ? d.salesByDayOfWeek : [],
        salesByHour: Array.isArray(d.salesByHour) ? d.salesByHour : [],
      } as DashboardSummary;
    }),

  dashboardItems: (params: { outletId: string; startDate: string; endDate: string }) =>
    apiClient.get('/reports/dashboard/items', { params }).then((r) => {
      const d = r.data as unknown as Record<string, unknown>;
      return {
        topItems: Array.isArray(d.topItems) ? d.topItems : [],
        categoryByVolume: Array.isArray(d.categoryByVolume) ? d.categoryByVolume : [],
        categoryBySales: Array.isArray(d.categoryBySales) ? d.categoryBySales : [],
        topItemsByCategory: Array.isArray(d.topItemsByCategory) ? d.topItemsByCategory : [],
      } as DashboardItemSummary;
    }),

  outletComparison: (params: { startDate: string; endDate: string }) =>
    apiClient.get('/reports/dashboard/outlet-comparison', { params }).then((r) => {
      const d = r.data as unknown as Record<string, unknown>;
      return {
        outlets: Array.isArray(d.outlets) ? d.outlets : [],
        totals: d.totals ?? { grossSales: 0, netSales: 0, transactions: 0 },
      } as OutletComparison;
    }),

  // Sales Report Detail
  salesSummary: (params: { outletId: string; startDate: string; endDate: string }) =>
    apiClient.get('/reports/sales/summary', { params }).then((r) => {
      const d = r.data as unknown as Record<string, unknown>;
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
      const d = r.data as unknown as Record<string, unknown>;
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
      const d = r.data as unknown as Record<string, unknown>;
      return {
        period: d.period ?? { start: '', end: '' },
        employees: Array.isArray(d.employees) ? d.employees : [],
        summary: d.summary ?? { totalEmployees: 0, totalSales: 0, totalTransactions: 0, totalVoids: 0, totalRefunds: 0 },
      } as EmployeeSalesReport;
    }),
};

