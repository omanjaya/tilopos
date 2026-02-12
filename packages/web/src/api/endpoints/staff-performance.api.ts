import { apiClient } from '../client';
import type { DateRange } from '@/types/report.types';

export interface StaffMember {
  employeeId: string;
  employeeName: string;
  role: string;
  outletName: string;
  totalSales: number;
  transactionCount: number;
  avgTransactionValue: number;
  rank: number;
}

export interface StaffLeaderboard {
  leaderboard: StaffMember[];
  totalStaff: number;
  topPerformer: StaffMember | null;
}

export interface StaffSummary {
  totalStaff: number;
  activeStaffCount: number;
  totalSales: number;
  avgSalesPerStaff: number;
}

interface StaffParams {
  dateRange?: DateRange;
  startDate?: string;
  endDate?: string;
  outletId?: string;
}

export const staffPerformanceApi = {
  /**
   * Get staff sales leaderboard
   */
  getLeaderboard: (params: StaffParams = {}) =>
    apiClient
      .get<StaffLeaderboard>('/owner/staff-performance/leaderboard', { params })
      .then((r) => r.data),

  /**
   * Get staff performance summary
   */
  getSummary: (params: Omit<StaffParams, 'outletId'> = {}) =>
    apiClient
      .get<StaffSummary>('/owner/staff-performance/summary', { params })
      .then((r) => r.data),
};
