import { apiClient } from '../client';
import type {
  SalesReport,
  FinancialReport,
  CustomerReport,
  DateRange,
  ProductReport,
  PaymentMethodReport,
  InventoryReport,
} from '@/types/report.types';

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
    }).catch(() => ({
      topProducts: [],
      totalProducts: 0,
      totalQuantitySold: 0,
    } as ProductReport)),

  paymentMethods: (params: ReportParams) =>
    apiClient.get('/reports/payment-methods', { params }).then((r) => {
      const d = r.data as unknown as Record<string, unknown>;
      return {
        methods: Array.isArray(d.methods) ? d.methods : [],
        totalAmount: Number(d.totalAmount ?? 0),
        totalTransactions: Number(d.totalTransactions ?? 0),
      } as PaymentMethodReport;
    }).catch(() => ({
      methods: [],
      totalAmount: 0,
      totalTransactions: 0,
    } as PaymentMethodReport)),

  inventory: (params: { outletId: string }) =>
    apiClient.get<InventoryReport>('/reports/inventory', { params }).then((r) => r.data),
};
