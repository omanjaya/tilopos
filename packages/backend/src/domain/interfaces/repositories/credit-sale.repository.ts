export interface CreditSaleRecord {
  id: string;
  transactionId: string;
  customerId: string;
  outletId: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  dueDate: Date | null;
  status: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Optionally populated
  customer?: { name: string; phone: string | null };
  transaction?: { receiptNumber: string };
}

export interface CreditPaymentRecord {
  id: string;
  creditSaleId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string | null;
  notes: string | null;
  receivedBy: string | null;
  createdAt: Date;
}

export interface CreditSaleFilters {
  outletId?: string;
  customerId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface CustomerOutstandingSummary {
  customerId: string;
  customerName: string;
  totalOutstanding: number;
  creditSaleCount: number;
  oldestDate: Date | null;
}

export interface ICreditSaleRepository {
  findById(id: string): Promise<CreditSaleRecord | null>;
  findByTransactionId(transactionId: string): Promise<CreditSaleRecord | null>;
  findAll(filters: CreditSaleFilters): Promise<CreditSaleRecord[]>;
  findByCustomerId(customerId: string, status?: string): Promise<CreditSaleRecord[]>;
  getCustomerOutstanding(
    businessId: string,
    outletId?: string,
  ): Promise<CustomerOutstandingSummary[]>;
  getPayments(creditSaleId: string): Promise<CreditPaymentRecord[]>;
}
