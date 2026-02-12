import { apiClient } from '../client';

export interface InvoiceListParams {
  outletId: string;
  startDate: string;
  endDate: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName: string | null;
  employeeName: string;
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paymentMethod: string;
  status: string;
}

export interface InvoiceListResponse {
  invoices: InvoiceItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalInvoices: number;
    totalAmount: number;
    totalTax: number;
    totalDiscount: number;
  };
}

export interface TransactionSummaryItem {
  id: string;
  receiptNumber: string;
  date: string;
  employeeName: string;
  customerName: string | null;
  grandTotal: number;
  paymentMethods: string[];
  status: string;
}

export interface DailySummary {
  date: string;
  count: number;
  total: number;
}

export interface TransactionsSummaryResponse {
  transactions: TransactionSummaryItem[];
  dailySummary: DailySummary[];
}

export interface ItemSummaryItem {
  productId: string;
  productName: string;
  variantName: string | null;
  totalQuantity: number;
  totalRevenue: number;
  averagePrice: number;
  transactionCount: number;
}

export interface ItemsSummaryResponse {
  items: ItemSummaryItem[];
  summary: {
    totalItems: number;
    totalQuantity: number;
    totalRevenue: number;
  };
}

export const invoicesApi = {
  list: (params: InvoiceListParams) =>
    apiClient.get<InvoiceListResponse>('/reports/invoices', { params }).then((r) => r.data),

  transactions: (params: Omit<InvoiceListParams, 'status' | 'page' | 'limit'>) =>
    apiClient.get<TransactionsSummaryResponse>('/reports/invoices/transactions', { params }).then((r) => r.data),

  itemsSummary: (params: Omit<InvoiceListParams, 'status' | 'page' | 'limit'>) =>
    apiClient.get<ItemsSummaryResponse>('/reports/invoices/items-summary', { params }).then((r) => r.data),
};
