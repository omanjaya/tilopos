export type TransactionStatus = 'completed' | 'voided' | 'refunded' | 'held' | 'partial_refund';
export type PaymentMethod = 'cash' | 'qris' | 'debit_card' | 'credit_card' | 'gopay' | 'ovo' | 'dana' | 'shopeepay' | 'linkaja';

export interface Transaction {
  id: string;
  transactionNumber: string;
  status: TransactionStatus;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceCharge: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  customerName: string | null;
  employeeName: string;
  outletId: string;
  items: TransactionItem[];
  payments: TransactionPayment[];
  createdAt: string;
  updatedAt: string;
}

export interface TransactionItem {
  id: string;
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
  reference: string | null;
  createdAt: string;
}

export interface TransactionListParams {
  outletId?: string;
  search?: string;
  status?: TransactionStatus | 'all';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
