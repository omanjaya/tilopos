export type SettlementStatus = 'pending' | 'settled' | 'disputed';

/** Row of GET /settlements (SettlementsService.toView): one outlet/date/payment method. */
export interface Settlement {
  id: string;
  date: string;
  outletId: string;
  outletName: string;
  paymentMethod: string;
  /** Gross amount. */
  totalSales: number;
  feeAmount: number;
  netAmount: number;
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
  status?: SettlementStatus | 'all';
  page?: number;
  /** 1..100 (the API wrapper asks for 100). */
  limit?: number;
  outletId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SettleRequest {
  notes?: string;
}
