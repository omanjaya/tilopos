/**
 * Store Analytics Interfaces
 *
 * Interfaces for store analytics data (orders, revenue, popular products).
 */

export interface StoreAnalyticsResult {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  popularProducts: {
    productId: string | null;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
  }[];
  ordersByStatus: Record<string, number>;
  recentOrders: number;
}
