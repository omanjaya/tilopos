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
  totalQuantitySold: number;
}

export interface ProductSales {
  productId: string;
  name: string;
  quantitySold: number;
  revenue: number;
  category: string | null;
}

export interface PaymentMethodReport {
  methods: PaymentMethodBreakdown[];
  totalAmount: number;
  totalTransactions: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface InventoryReport {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  stockMovements: number;
  items: InventoryItem[];
  topMovingProducts: TopMovingProduct[];
  slowMovingProducts: SlowMovingProduct[];
}

export interface InventoryItem {
  id: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  unitPrice: number;
  status: 'normal' | 'low' | 'out_of_stock';
}

export interface TopMovingProduct {
  name: string;
  movements: number;
  trend: 'up' | 'down' | 'stable';
}

export interface SlowMovingProduct {
  name: string;
  movements: number;
  daysSinceLastSale: number;
}

// Kitchen Report Types (F&B)
export interface KitchenReport {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  avgPrepTime: number;
  targetPrepTime: number;
  onTimeRate: number;
  peakHours: PeakHour[];
  popularItems: PopularKitchenItem[];
  slowItems: SlowKitchenItem[];
}

export interface PeakHour {
  hour: string;
  orders: number;
}

export interface PopularKitchenItem {
  name: string;
  orders: number;
  avgTime: number;
}

export interface SlowKitchenItem {
  name: string;
  avgTime: number;
  orders: number;
}

// Table Report Types (F&B)
export interface TableReport {
  totalTables: number;
  avgOccupancy: number;
  avgDiningTime: number;
  turnoverRate: number;
  totalGuests: number;
  avgGuestsPerTable: number;
  tablePerformance: TablePerformance[];
  peakDiningHours: PeakDiningHour[];
}

export interface TablePerformance {
  name: string;
  turnover: number;
  avgTime: number;
  revenue: number;
}

export interface PeakDiningHour {
  hour: string;
  occupancy: number;
}

// Staff Report Types (Service)
export interface StaffReport {
  totalStaff: number;
  totalServices: number;
  totalRevenue: number;
  avgServiceTime: number;
  avgRating: number;
  staffPerformance: StaffPerformance[];
  serviceBreakdown: ServiceBreakdown[];
}

export interface StaffPerformance {
  id: string;
  name: string;
  services: number;
  revenue: number;
  rating: number;
  commission: number;
}

export interface ServiceBreakdown {
  service: string;
  count: number;
  avgTime: number;
}

// Appointment Report Types (Service)
export interface AppointmentReport {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  totalRevenue: number;
  avgBookingValue: number;
  conversionRate: number;
  bookingsByDay: BookingByDay[];
  bookingsBySource: BookingBySource[];
  popularServices: PopularService[];
}

export interface BookingByDay {
  day: string;
  count: number;
}

export interface BookingBySource {
  source: string;
  count: number;
  percentage: number;
}

export interface PopularService {
  name: string;
  bookings: number;
}

// Dashboard Summary (Moka-style)
export interface DayOfWeekSales {
  day: number;
  dayName: string;
  grossSales: number;
  numSales: number;
}

export interface HourlySales {
  hour: number;
  grossSales: number;
  numSales: number;
}

export interface DashboardSummary {
  grossSales: number;
  netSales: number;
  grossProfit: number;
  transactions: number;
  averageSalePerTransaction: number;
  grossMargin: number;
  salesByDayOfWeek: DayOfWeekSales[];
  salesByHour: HourlySales[];
}

// Dashboard Item Summary
export interface TopItemSales {
  productId: string;
  name: string;
  category: string;
  quantitySold: number;
  grossSales: number;
}

export interface CategoryBreakdown {
  category: string;
  totalQuantity?: number;
  totalSales?: number;
  percentage: number;
}

export interface CategoryTopItems {
  category: string;
  items: { name: string; quantitySold: number; grossSales: number }[];
}

export interface DashboardItemSummary {
  topItems: TopItemSales[];
  categoryByVolume: CategoryBreakdown[];
  categoryBySales: CategoryBreakdown[];
  topItemsByCategory: CategoryTopItems[];
}

// Outlet Comparison
export interface OutletTopItem {
  name: string;
  grossSales: number;
  quantity: number;
}

export interface OutletComparisonItem {
  outletId: string;
  outletName: string;
  grossSales: number;
  netSales: number;
  transactions: number;
  averageSale: number;
  grossProfit: number;
  grossMargin: number;
  topItems: OutletTopItem[];
}

export interface OutletComparison {
  outlets: OutletComparisonItem[];
  totals: { grossSales: number; netSales: number; transactions: number };
}

// Sales Report Detail Types
export interface SalesSummaryReport {
  grossSales: number;
  discountAmount: number;
  refundAmount: number;
  netSales: number;
  taxAmount: number;
  serviceCharge: number;
  roundingAmount: number;
  totalCollected: number;
  totalTransactions: number;
  refundTransactions: number;
  averageOrderValue: number;
}

export interface DiscountBreakdownReport {
  totalDiscount: number;
  transactionLevelDiscount: number;
  itemLevelDiscount: number;
  transactionsWithDiscount: number;
  transactionsWithoutDiscount: number;
  promotionBreakdown: { promotionId: string; name: string; usedCount: number; totalDiscount: number }[];
}

export interface EmployeeSalesReport {
  period: { start: string; end: string };
  employees: {
    employeeId: string;
    employeeName: string;
    role: string;
    totalSales: number;
    transactionCount: number;
    averageTransaction: number;
    voidCount: number;
    refundCount: number;
    averageItemsPerTransaction: number;
  }[];
  summary: { totalEmployees: number; totalSales: number; totalTransactions: number; totalVoids: number; totalRefunds: number };
}

export type SalesReportTab = 'summary' | 'gross-profit' | 'payment-methods' | 'item-sales' | 'category-sales' | 'discounts' | 'taxes' | 'collected-by';

