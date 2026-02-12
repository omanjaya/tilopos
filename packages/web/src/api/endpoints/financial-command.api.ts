import { apiClient } from '../client';
import type { DateRange } from '@/types/report.types';

export interface RevenueExpense {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  breakdown: {
    cogs: number;
    purchases: number;
    refunds: number;
    discounts: number;
    tax: number;
  };
  revenueByDate: Array<{ date: string; revenue: number }>;
  expensesByDate: Array<{ date: string; expenses: number }>;
}

export interface OutletProfit {
  outletId: string;
  outletName: string;
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;
  breakdown: {
    cogs: number;
    refunds: number;
    discounts: number;
  };
}

export interface ProfitByOutlet {
  outlets: OutletProfit[];
}

export interface CashFlow {
  totalCashIn: number;
  totalCashOut: number;
  netCashFlow: number;
  cashInByMethod: Array<{ method: string; amount: number }>;
  cashFlowByDate: Array<{
    date: string;
    cashIn: number;
    cashOut: number;
    netCashFlow: number;
  }>;
}

export interface PaymentMethodAnalysis {
  methods: Array<{
    method: string;
    totalAmount: number;
    transactionCount: number;
    avgTransactionValue: number;
  }>;
  totalAmount: number;
  totalTransactions: number;
}

export interface ExpenseCategories {
  categories: Array<{
    category: string;
    amount: number;
    description: string;
  }>;
  totalExpenses: number;
}

interface FinancialParams {
  dateRange?: DateRange;
  startDate?: string;
  endDate?: string;
  outletId?: string;
}

export const financialCommandApi = {
  /**
   * Get revenue vs expense analysis
   */
  getRevenueExpense: (params: FinancialParams = {}) =>
    apiClient
      .get<RevenueExpense>('/owner/financial/revenue-expense', { params })
      .then((r) => r.data),

  /**
   * Get profit analysis by outlet
   */
  getProfitByOutlet: (params: Omit<FinancialParams, 'outletId'> = {}) =>
    apiClient
      .get<ProfitByOutlet>('/owner/financial/profit-by-outlet', { params })
      .then((r) => r.data),

  /**
   * Get cash flow monitoring
   */
  getCashFlow: (params: FinancialParams = {}) =>
    apiClient
      .get<CashFlow>('/owner/financial/cash-flow', { params })
      .then((r) => r.data),

  /**
   * Get detailed payment methods analysis
   */
  getPaymentMethodsAnalysis: (params: FinancialParams = {}) =>
    apiClient
      .get<PaymentMethodAnalysis>('/owner/financial/payment-methods-analysis', { params })
      .then((r) => r.data),

  /**
   * Get expense categories breakdown
   */
  getExpenseCategories: (params: FinancialParams = {}) =>
    apiClient
      .get<ExpenseCategories>('/owner/financial/expense-categories', { params })
      .then((r) => r.data),
};
