export interface Settlement {
  id: string;
  settlementNumber: string;
  paymentMethod: string;
  totalAmount: number;
  transactionCount: number;
  status: 'pending' | 'completed' | 'failed';
  settledAt: string | null;
  dateFrom: string;
  dateTo: string;
  createdAt: string;
  transactions?: Array<{
    id: string;
    transactionNumber: string;
    amount: number;
    paymentMethod: string;
    createdAt: string;
  }>;
}
