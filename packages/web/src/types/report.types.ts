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

