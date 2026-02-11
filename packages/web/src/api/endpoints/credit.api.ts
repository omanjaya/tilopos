import { apiClient } from '../client';

// Types for credit sales
export interface CreditSale {
  id: string;
  transactionId: string;
  customerId: string;
  outletId: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  dueDate: string | null;
  status: 'outstanding' | 'partially_paid' | 'settled' | 'overdue';
  notes: string | null;
  creditNotes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { name: string; phone: string | null };
  transaction?: { receiptNumber: string };
}

export interface CreditPayment {
  id: string;
  creditSaleId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string | null;
  notes: string | null;
  receivedBy: string | null;
  createdAt: string;
}

export interface CustomerOutstandingSummary {
  customerId: string;
  customerName: string;
  totalOutstanding: number;
  creditSaleCount: number;
  oldestDate: string | null;
}

export interface CreditSaleListParams {
  outletId?: string;
  customerId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateCreditTransactionRequest {
  outletId: string;
  employeeId: string;
  customerId: string;
  shiftId: string;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  tableId?: string;
  items: {
    productId: string;
    variantId?: string;
    quantity: number;
    modifierIds?: string[];
    notes?: string;
    unitPrice?: number;
  }[];
  payments?: {
    method: string;
    amount: number;
    referenceNumber?: string;
  }[];
  notes?: string;
  dueDate?: string;
  creditNotes?: string;
}

export interface RecordCreditPaymentRequest {
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
}

export const creditApi = {
  list: (params?: CreditSaleListParams) =>
    apiClient.get('/credit-sales', { params }).then((r) => r.data as CreditSale[]),

  getById: (id: string) =>
    apiClient.get(`/credit-sales/${id}`).then((r) => r.data as CreditSale),

  getCustomerSales: (customerId: string, status?: string) =>
    apiClient
      .get(`/credit-sales/customer/${customerId}`, { params: { status } })
      .then((r) => r.data as CreditSale[]),

  getOutstandingReport: (outletId?: string) =>
    apiClient
      .get('/credit-sales/reports/outstanding', { params: { outletId } })
      .then((r) => r.data as CustomerOutstandingSummary[]),

  create: (data: CreateCreditTransactionRequest) =>
    apiClient.post('/credit-sales', data).then((r) => r.data),

  recordPayment: (creditSaleId: string, data: RecordCreditPaymentRequest) =>
    apiClient
      .post(`/credit-sales/${creditSaleId}/payments`, data)
      .then((r) => r.data),

  getPayments: (creditSaleId: string) =>
    apiClient
      .get(`/credit-sales/${creditSaleId}/payments`)
      .then((r) => r.data as CreditPayment[]),
};
