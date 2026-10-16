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

/** GET /reports/inventory (inventory-reports.controller.ts) — point-in-time stock of one outlet. */
export interface InventoryReport {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  /** null for roles without cost access (supervisor). */
  totalValue: number | null;
  items: InventoryReportItem[];
}

export interface InventoryReportItem {
  id: string;
  productId: string | null;
  productName: string;
  variantName: string | null;
  sku: string | null;
  currentStock: number;
  lowStockAlert: number;
  unit: string;
  /** null for roles without cost access (supervisor). */
  costPrice: number | null;
  stockValue: number | null;
}

// Kitchen Report Types (F&B) — GET /reports/kitchen (kitchen-reports.controller.ts)
export interface KitchenReport {
  period: { start: string; end: string };
  summary: KitchenReportSummary;
  peakHours: KitchenPeakHour[];
  itemsPreparedByProduct: KitchenPreparedItem[];
  stations: KitchenStationStat[];
  orderStatusBreakdown: { status: string; count: number }[];
}

export interface KitchenReportSummary {
  totalOrders: number;
  completedOrders: number;
  avgPrepTimeMinutes: number;
  fastestPrepMinutes: number;
  slowestPrepMinutes: number;
  ordersPerHour: number;
  slaTargetMinutes: number;
  slaAdherenceRate: number;
}

export interface KitchenPeakHour {
  hour: number;
  orderCount: number;
}

export interface KitchenPreparedItem {
  productId: string;
  productName: string;
  totalPrepared: number;
}

export interface KitchenStationStat {
  station: string;
  itemCount: number;
  totalQuantity: number;
  avgPrepMinutes: number;
}

// Table Report Types (F&B)
export interface TableReport {
  totalTables: number;
  /** Estimated from dining time and assumedOperatingHoursPerDay. */
  avgOccupancy: number;
  occupancyEstimated: boolean;
  assumedOperatingHoursPerDay: number;
  avgDiningTime: number;
  turnoverRate: number;
  /** Guest counts are not recorded: always null for now. */
  totalGuests: number | null;
  avgGuestsPerTable: number | null;
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
  /** No rating data is recorded: always null for now. */
  avgRating: number | null;
  staffPerformance: StaffPerformance[];
  serviceBreakdown: ServiceBreakdown[];
}

export interface StaffPerformance {
  id: string;
  name: string;
  services: number;
  revenue: number;
  /** null: no rating data / no commission configuration. */
  rating: number | null;
  commission: number | null;
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
  /** Always [] — booking source is not tracked. */
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
  /** null for roles without cost access (supervisor). */
  grossProfit: number | null;
  transactions: number;
  averageSalePerTransaction: number;
  grossMargin: number | null;
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
  /** null for roles without cost access (supervisor). */
  grossProfit: number | null;
  grossMargin: number | null;
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
  /** totalDiscount is null: the per-promotion discount amount is not recorded. */
  promotionBreakdown: { promotionId: string; name: string; usedCount: number; totalDiscount: number | null }[];
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

