import { apiClient } from '../client';
import type { DateRange } from '@/types/report.types';

export interface PurchaseHistorySummary {
  totalPurchases: number;
  totalOrders: number;
  avgOrderValue: number;
  /** pending = draft, approved = ordered, partial, completed = received, cancelled. */
  statusCounts: {
    pending: number;
    approved: number;
    partial: number;
    completed: number;
    cancelled: number;
  };
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
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

/**
 * GET /suppliers/:id/payment-status — there is no supplier-payment ledger, so this
 * only summarises PO receipt status (paymentTracking = 'NOT_AVAILABLE').
 */
export interface PaymentStatusSummary {
  totalPurchases: number;
  /** Sum of POs still open (draft/ordered/partial). */
  openAmount: number;
  /** Sum of received POs. */
  receivedAmount: number;
  /** receivedAmount / totalPurchases in percent. */
  receivedRate: number;
  openOrdersCount: number;
}

export interface OpenPurchaseOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  orderDate: string;
}

export interface PaymentStatus {
  supplierName: string;
  paymentTracking: 'NOT_AVAILABLE';
  summary: PaymentStatusSummary;
  openOrders: OpenPurchaseOrder[];
}

export interface SupplierPrice {
  supplierId: string;
  supplierName: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  orderCount: number;
  lastOrderDate: string;
}

export interface ProductComparison {
  productId: string;
  productName: string;
  suppliers: SupplierPrice[];
  cheapestSupplier: string;
  /** Average unit price of the most expensive supplier. */
  mostExpensivePrice: number;
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
   * Purchase history for a supplier (owner/manager/inventory). startDate/endDate are
   * YYYY-MM-DD business days (Asia/Jakarta).
   */
  getPurchaseHistory: (supplierId: string, params: HistoryParams = {}) =>
    apiClient
      .get<PurchaseHistory>(`/suppliers/${supplierId}/purchase-history`, { params })
      .then((r) => r.data),

  /**
   * PO receipt status for a supplier (no payment ledger). owner/manager/inventory.
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
