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
  businessId?: string;
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
