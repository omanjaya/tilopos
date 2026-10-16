import { apiClient } from '../client';
import type { DateRange } from '@/types/report.types';

export interface RevenueExpense {
  /** Net sales EXCLUDING tax, net of discounts and refunds. */
  totalRevenue: number;
  /** COGS only (purchases are informational cash-out, not an expense). */
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  /** Omitted by the backend when the business has no outlets. */
  breakdown?: {
    cogs: number;
    /** Received supplier purchases in the period — NOT included in totalExpenses. */
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

interface CategoryAmount {
  category: string;
  amount: number;
  description: string;
}

/** GET /owner/financial/expense-categories */
export interface ExpenseCategories {
  /** Expenses: COGS only. */
  categories: CategoryAmount[];
  /** = COGS */
  totalExpenses: number;
  /** Refunds / Discounts: reduce revenue, not expenses. */
  contraRevenue: Array<CategoryAmount & { category: 'Refunds' | 'Discounts' }>;
  /** Supplier purchases (cash out), informational. */
  purchases: { amount: number; description: string };
}

interface FinancialParams {
  dateRange?: DateRange;
  startDate?: string;
  endDate?: string;
}

/** Only revenue-expense supports an outlet filter; the other endpoints are business-wide. */
interface RevenueExpenseParams extends FinancialParams {
  outletId?: string;
}

export const financialCommandApi = {
  /**
   * Get revenue vs expense analysis
   */
  getRevenueExpense: (params: RevenueExpenseParams = {}) =>
    apiClient
      .get<RevenueExpense>('/owner/financial/revenue-expense', { params })
      .then((r) => r.data),

  /**
   * Get profit analysis by outlet
   */
  getProfitByOutlet: (params: FinancialParams = {}) =>
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
