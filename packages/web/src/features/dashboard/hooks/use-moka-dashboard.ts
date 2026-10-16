import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/api/endpoints/reports.api';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { format, startOfMonth } from 'date-fns';
import { useHasRole } from '@/features/auth/use-permission';

export type DashboardTab = 'dashboard' | 'outlet_comparison';

export interface DateRangeValue {
  from: Date;
  to: Date;
}

export function useMokaDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const user = useAuthStore((s) => s.user);
  const outletId = selectedOutletId ?? user?.outletId ?? '';
  // /reports/dashboard/* is @Roles(owner, manager, supervisor)
  const hasAccess = useHasRole('SUPERVISION');
  const enabled = !!outletId && hasAccess;

  const startDate = format(dateRange.from, 'yyyy-MM-dd');
  const endDate = format(dateRange.to, 'yyyy-MM-dd');

  // Summary — always active
  const summary = useQuery({
    queryKey: ['dashboard', 'summary', outletId, startDate, endDate],
    queryFn: () => reportsApi.dashboardSummary({ outletId, startDate, endDate }),
    enabled,
  });

  // Items — only when dashboard tab active
  const items = useQuery({
    queryKey: ['dashboard', 'items', outletId, startDate, endDate],
    queryFn: () => reportsApi.dashboardItems({ outletId, startDate, endDate }),
    enabled: enabled && activeTab === 'dashboard',
  });

  // Outlet comparison — only when tab active
  const outletComparison = useQuery({
    queryKey: ['dashboard', 'outlet-comparison', startDate, endDate],
    queryFn: () => reportsApi.outletComparison({ startDate, endDate }),
    enabled: hasAccess && activeTab === 'outlet_comparison',
  });

  const isLoading = useMemo(() => {
    if (activeTab === 'dashboard') return summary.isLoading;
    if (activeTab === 'outlet_comparison') return outletComparison.isLoading;
    return false;
  }, [activeTab, summary.isLoading, outletComparison.isLoading]);

  return {
    activeTab,
    setActiveTab,
    dateRange,
    setDateRange,
    outletId,
    hasAccess,
    isLoading,
    userName: user?.name?.split(' ')[0] ?? 'User',

    // Dashboard tab
    summary: summary.data,
    summaryLoading: summary.isLoading,
    summaryError: summary.error,
    refetchSummary: summary.refetch,
    items: items.data,
    itemsLoading: items.isLoading,
    itemsError: items.error,
    refetchItems: items.refetch,

    // Outlet comparison tab
    outletComparison: outletComparison.data,
    outletComparisonLoading: outletComparison.isLoading,
    outletComparisonError: outletComparison.error,
    refetchOutletComparison: outletComparison.refetch,
  };
}
