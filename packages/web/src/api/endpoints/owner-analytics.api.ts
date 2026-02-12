import { apiClient } from '../client';
import type { DateRange } from '@/types/report.types';

export interface OwnerOverview {
  totalSales: number;
  totalProfit: number;
  totalTransactions: number;
  totalCustomers: number;
  averageOrderValue: number;
  outletsCount: number;
}

export interface OutletPerformance {
  outletId: string;
  outletName: string;
  sales: number;
  transactions: number;
  avgOrderValue: number;
}

export interface OutletsComparison {
  outlets: OutletPerformance[];
}

export interface CriticalAlert {
  type: 'low_stock' | 'stuck_transfer' | 'no_sales' | 'high_refunds' | 'inactive_outlet';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  outletId?: string;
  outletName?: string;
  count?: number;
}

export interface CriticalAlerts {
  alerts: CriticalAlert[];
}

export interface RealTimeMetrics {
  todaySales: number;
  todayTransactions: number;
  lastHourSales: number;
  lastHourTransactions: number;
  activeOrders: number;
  outletsCount: number;
  timestamp: string;
}

interface AnalyticsParams {
  dateRange?: DateRange;
  startDate?: string;
  endDate?: string;
}

export const ownerAnalyticsApi = {
  /**
   * Get business-wide overview metrics (all outlets)
   */
  getOverview: (params: AnalyticsParams = {}) =>
    apiClient
      .get<OwnerOverview>('/owner/analytics/overview', { params })
      .then((r) => r.data),

  /**
   * Compare performance across all outlets
   */
  getOutletsComparison: (params: AnalyticsParams = {}) =>
    apiClient
      .get<OutletsComparison>('/owner/analytics/outlets-comparison', { params })
      .then((r) => r.data),

  /**
   * Get critical business alerts and issues
   */
  getCriticalAlerts: () =>
    apiClient
      .get<CriticalAlerts>('/owner/analytics/critical-alerts')
      .then((r) => r.data),

  /**
   * Get real-time metrics (no cache)
   */
  getRealTimeMetrics: () =>
    apiClient
      .get<RealTimeMetrics>('/owner/analytics/real-time-metrics')
      .then((r) => r.data),
};
