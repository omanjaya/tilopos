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
  /** Same value as `notes`. */
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

export type CreditSaleStatus = 'outstanding' | 'partially_paid' | 'settled' | 'overdue';

/** GET /credit-sales query: page/limit (default & max 100); still returns a plain array. */
export interface CreditSaleListParams {
  outletId?: string;
  customerId?: string;
  status?: CreditSaleStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/** Methods accepted for repayments (backend CREDIT_PAYMENT_METHODS; no credit_note). */
export type CreditPaymentMethod =
  | 'cash'
  | 'card'
  | 'debit_card'
  | 'credit_card'
  | 'gopay'
  | 'ovo'
  | 'dana'
  | 'shopeepay'
  | 'linkaja'
  | 'qris'
  | 'bank_transfer';

/** POST /credit-sales response (CreateCreditTransactionUseCase). */
export interface CreateCreditTransactionResponse {
  transactionId: string;
  creditSaleId: string;
  receiptNumber: string;
  grandTotal: number;
  downPayment: number;
  outstandingAmount: number;
}

/**
 * POST /credit-sales body. The employee comes from the JWT. Manual discounts are capped
 * per role (cashier 10%, supervisor 50%); unitPrice is honoured only with
 * pos_price_editing + role >= supervisor. credit_note down payments are rejected.
 */
export interface CreateCreditTransactionRequest {
  outletId: string;
  customerId: string;
  shiftId: string;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  tableId?: string;
  items: {
    productId?: string;
    bundleId?: string;
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
  discountAmount?: number;
  discountPercent?: number;
}

export interface RecordCreditPaymentRequest {
  amount: number;
  paymentMethod: CreditPaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

/** Monetary fields are converted to numbers defensively (Prisma Decimal may serialize as string). */
function normalizeCreditSale(cs: CreditSale): CreditSale {
  return {
    ...cs,
    totalAmount: Number(cs.totalAmount ?? 0),
    paidAmount: Number(cs.paidAmount ?? 0),
    outstandingAmount: Number(cs.outstandingAmount ?? 0),
  };
}

function normalizeCreditSales(data: unknown): CreditSale[] {
  if (!Array.isArray(data)) {
    throw new Error('Format respons daftar piutang tidak valid');
  }
  return (data as CreditSale[]).map(normalizeCreditSale);
}

export const creditApi = {
  list: (params?: CreditSaleListParams) =>
    apiClient
      .get<CreditSale[]>('/credit-sales', { params })
      .then((r) => normalizeCreditSales(r.data)),

  getById: (id: string) =>
    apiClient.get<CreditSale>(`/credit-sales/${id}`).then((r) => normalizeCreditSale(r.data)),

  getCustomerSales: (customerId: string, status?: CreditSaleStatus) =>
    apiClient
      .get<CreditSale[]>(`/credit-sales/customer/${customerId}`, { params: { status } })
      .then((r) => normalizeCreditSales(r.data)),

  create: (data: CreateCreditTransactionRequest) =>
    apiClient.post<CreateCreditTransactionResponse>('/credit-sales', data).then((r) => r.data),

  recordPayment: (creditSaleId: string, data: RecordCreditPaymentRequest) =>
    apiClient
      .post<CreditPayment>(`/credit-sales/${creditSaleId}/payments`, data)
      .then((r) => r.data),

  /** GET /credit-sales/:id/payments — paged (default 20); the detail view asks for 100. */
  getPayments: (creditSaleId: string, params: { page?: number; limit?: number } = { limit: 100 }) =>
    apiClient
      .get<CreditPayment[]>(`/credit-sales/${creditSaleId}/payments`, { params })
      .then((r) => {
        if (!Array.isArray(r.data)) {
          throw new Error('Format respons pembayaran piutang tidak valid');
        }
        return r.data.map((p) => ({ ...p, amount: Number(p.amount ?? 0) }));
      }),
};
