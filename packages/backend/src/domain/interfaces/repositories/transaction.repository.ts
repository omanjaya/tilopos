export interface ITransactionRepository {
  findById(id: string): Promise<TransactionRecord | null>;
  findByReceiptNumber(receiptNumber: string): Promise<TransactionRecord | null>;
  findByOutletAndDateRange(outletId: string, startDate: Date, endDate: Date): Promise<TransactionRecord[]>;
  save(transaction: TransactionRecord): Promise<TransactionRecord>;
  update(id: string, data: Partial<TransactionRecord>): Promise<TransactionRecord>;
  findItemsByTransactionId(transactionId: string): Promise<TransactionItemRecord[]>;
  findPaymentsByTransactionId(transactionId: string): Promise<PaymentRecord[]>;
}

export interface TransactionRecord {
  id: string;
  businessId?: string;
  outletId: string;
  employeeId: string | null;
  customerId: string | null;
  shiftId: string | null;
  receiptNumber: string;
  transactionType: string;
  orderType: string;
  tableId: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceCharge: number;
  grandTotal: number;
  notes: string | null;
  status: string;
  voidedAt?: Date;
  voidedBy?: string;
  voidReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionItemRecord {
  id: string;
  transactionId: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  subtotal: number;
  notes: string | null;
}

export interface PaymentRecord {
  id: string;
  transactionId: string;
  paymentMethod: string;
  amount: number;
  referenceNumber: string | null;
  status: string;
}
