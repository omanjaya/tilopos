export interface SalesReport {
  totalSales: number;
  totalTransactions: number;
  averageOrderValue: number;
  totalCustomers: number;
  salesByDate: SalesByDate[];
}

export interface SalesByDate {
  date: string;
  sales: number;
  transactions: number;
}

export interface FinancialReport {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  grossMargin: number;
}

export interface CustomerReport {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  topCustomers: TopCustomer[];
}

export interface TopCustomer {
  id: string;
  name: string;
  totalSpent: number;
  transactionCount: number;
}

export type DateRange = 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom';

export interface ProductReport {
  topProducts: ProductSales[];
  totalProducts: number;
}

export interface ProductSales {
  id: string;
  name: string;
  quantitySold: number;
  revenue: number;
  category: string | null;
}

export interface PaymentMethodReport {
  methods: PaymentMethodBreakdown[];
  totalAmount: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface InventoryReport {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  items: InventoryItem[];
}

export interface InventoryItem {
  id: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  status: 'normal' | 'low' | 'out_of_stock';
}
