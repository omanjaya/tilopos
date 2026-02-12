import { apiClient } from '../client';
import type { DateRange } from '@/types/report.types';

export interface PurchaseHistorySummary {
  totalPurchases: number;
  totalOrders: number;
  avgOrderValue: number;
  statusCounts: {
    pending: number;
    approved: number;
    completed: number;
    cancelled: number;
  };
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  orderDate: Date;
  status: string;
  totalAmount: number;
  outletName: string;
  itemCount: number;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

export interface PurchaseHistory {
  supplierName: string;
  summary: PurchaseHistorySummary;
  orders: PurchaseOrder[];
}

export interface PaymentStatusSummary {
  totalDebt: number;
  totalPaid: number;
  totalPurchases: number;
  paymentRate: number;
  unpaidOrdersCount: number;
  overdueOrdersCount: number;
}

export interface UnpaidOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  orderDate: Date;
  dueDate: Date | null;
  daysOverdue?: number;
}

export interface PaymentStatus {
  supplierName: string;
  summary: PaymentStatusSummary;
  unpaidOrders: UnpaidOrder[];
  overdueOrders: UnpaidOrder[];
}

export interface SupplierPrice {
  supplierId: string;
  supplierName: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  orderCount: number;
  lastOrderDate: Date;
}

export interface ProductComparison {
  productId: string;
  productName: string;
  suppliers: SupplierPrice[];
  cheapestSupplier: string;
  mostExpensiveSupplier: number;
  priceDifference: number;
  savingsPercentage: number;
}

export interface SupplierComparison {
  comparisons: ProductComparison[];
  totalProducts: number;
}

export interface ReorderAlert {
  productId: string;
  productName: string;
  sku: string;
  outletName: string;
  currentStock: number;
  recommendedSupplier: {
    id: string;
    name: string;
    lastPrice: number;
  } | null;
  suggestedOrderQuantity: number;
}

export interface ReorderAlerts {
  alerts: ReorderAlert[];
  totalAlerts: number;
  criticalAlerts: number;
}

interface HistoryParams {
  dateRange?: DateRange;
  startDate?: string;
  endDate?: string;
}

export const supplierAnalyticsApi = {
  /**
   * Get purchase history for a supplier
   */
  getPurchaseHistory: (supplierId: string, params: HistoryParams = {}) =>
    apiClient
      .get<PurchaseHistory>(`/suppliers/${supplierId}/purchase-history`, { params })
      .then((r) => r.data),

  /**
   * Get payment status for a supplier (hutang/piutang)
   */
  getPaymentStatus: (supplierId: string) =>
    apiClient
      .get<PaymentStatus>(`/suppliers/${supplierId}/payment-status`)
      .then((r) => r.data),

  /**
   * Compare prices across suppliers
   */
  getSupplierComparison: () =>
    apiClient
      .get<SupplierComparison>('/suppliers/comparison')
      .then((r) => r.data),

  /**
   * Get auto reorder alerts
   */
  getReorderAlerts: () =>
    apiClient
      .get<ReorderAlerts>('/suppliers/reorder-alerts')
      .then((r) => r.data),
};
