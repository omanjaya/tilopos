/** Backend Prisma TransactionStatus enum. */
export type TransactionStatus =
  | 'pending'
  | 'completed'
  | 'voided'
  | 'refunded'
  | 'partially_refunded'
  | 'credit'
  | 'partially_paid'
  | 'split';
/** Backend Prisma PaymentMethod enum. */
export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'qris'
  | 'debit_card'
  | 'credit_card'
  | 'gopay'
  | 'ovo'
  | 'dana'
  | 'shopeepay'
  | 'linkaja'
  | 'bank_transfer'
  | 'credit_note';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

/** Row of GET /pos/transactions and body of GET /pos/transactions/:id (TransactionQueriesUseCase.toDto). */

export interface Transaction {
  id: string;
  transactionNumber: string;
  transactionType: 'sale' | 'refund';
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  status: TransactionStatus;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceCharge: number;
  /** Cash rounding: totalAmount = subtotal - discount + tax + service + roundingAmount. */
  roundingAmount?: number;
  totalAmount: number;
  /** Sum of completed payments only. */
  paidAmount: number;
  changeAmount: number;
  customerId: string | null;
  customerName: string | null;
  employeeName: string;
  outletId: string;
  refundOfId: string | null;
  notes: string | null;
  items: TransactionItem[];
  payments: TransactionPayment[];
  voidedAt?: string | null;
  voidedBy?: string | null;
  voidReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionItem {
  id: string;
  productId: string | null;
  variantId: string | null;
  bundleId: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers: string[];
  notes: string | null;
}

export interface TransactionPayment {
  id: string;
  method: PaymentMethod;
  amount: number;
  /** 'pending' for gateway methods until the webhook confirms. */
  status: PaymentStatus;
  reference: string | null;
  createdAt: string;
}

/** GET /pos/transactions query (ListTransactionsQueryDto). */
export interface TransactionListParams {
  outletId?: string;
  search?: string;
  /** 'all', one status or a comma-separated list. */
  status?: string;
  /** YYYY-MM-DD (Asia/Jakarta business day) or ISO instant. */
  startDate?: string;
  /** YYYY-MM-DD (inclusive business day) or ISO instant. */
  endDate?: string;
  page?: number;
  limit?: number;
}

/** GET /pos/transactions summary over the whole filtered set (not just the page). */
export interface TransactionListSummary {
  count: number;
  grandTotal: number;
  netSales: number;
}
