export type SettlementStatus = 'pending' | 'settled' | 'disputed';

export interface Settlement {
  id: string;
  date: string;
  outletId: string;
  outletName: string;
  totalSales: number;
  cashAmount: number;
  nonCashAmount: number;
  settledAmount: number;
  status: SettlementStatus;
  paymentBreakdown: PaymentBreakdownItem[];
  notes: string | null;
  settledAt: string | null;
  settledBy: string | null;
  businessId: string;
  createdAt: string;
}

export interface PaymentBreakdownItem {
  method: string;
  amount: number;
  transactionCount: number;
}

export interface SettlementListParams {
  search?: string;
  status?: SettlementStatus;
  outletId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SettleRequest {
  notes?: string;
}

export interface DisputeRequest {
  reason: string;
}
