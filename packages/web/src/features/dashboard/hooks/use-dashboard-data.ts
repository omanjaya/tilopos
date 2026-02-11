import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/api/endpoints/reports.api';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { getPreviousPeriod } from '@/lib/date-utils';
import type { DateRange } from '@/types/report.types';

export function useDashboardData(dateRange: DateRange) {
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const user = useAuthStore((s) => s.user);
  const outletId = selectedOutletId ?? user?.outletId ?? '';
  const hasAccess = !!user?.role && ['owner', 'super_admin', 'manager', 'supervisor'].includes(user.role);
  const enabled = !!outletId && hasAccess;

  const prevPeriod = getPreviousPeriod(dateRange);

  // Current period queries
  const sales = useQuery({
    queryKey: ['reports', 'sales', outletId, dateRange],
    queryFn: () => reportsApi.sales({ outletId, dateRange }),
    enabled,
  });

  const financial = useQuery({
    queryKey: ['reports', 'financial', outletId, dateRange],
    queryFn: () => reportsApi.financial({ outletId, dateRange }),
    enabled,
  });

  const customers = useQuery({
    queryKey: ['reports', 'customers', outletId, dateRange],
    queryFn: () => reportsApi.customers({ outletId, dateRange }),
    enabled,
  });

  const products = useQuery({
    queryKey: ['reports', 'products', outletId, dateRange],
    queryFn: () => reportsApi.products({ outletId, dateRange }),
    enabled,
  });

  const paymentMethods = useQuery({
    queryKey: ['reports', 'payment-methods', outletId, dateRange],
    queryFn: () => reportsApi.paymentMethods({ outletId, dateRange }),
    enabled,
  });

  // Previous period for trend comparison
  const previousSales = useQuery({
    queryKey: ['reports', 'sales', outletId, 'custom', prevPeriod?.startDate, prevPeriod?.endDate],
    queryFn: () => reportsApi.sales({
      outletId,
      dateRange: 'custom',
      startDate: prevPeriod!.startDate,
      endDate: prevPeriod!.endDate,
    }),
    enabled: enabled && !!prevPeriod,
  });

  const previousFinancial = useQuery({
    queryKey: ['reports', 'financial', outletId, 'custom', prevPeriod?.startDate, prevPeriod?.endDate],
    queryFn: () => reportsApi.financial({
      outletId,
      dateRange: 'custom',
      startDate: prevPeriod!.startDate,
      endDate: prevPeriod!.endDate,
    }),
    enabled: enabled && !!prevPeriod,
  });

  const isLoading = sales.isLoading || financial.isLoading || customers.isLoading;

  return {
    outletId,
    hasAccess,
    isLoading,
    sales: sales.data,
    financial: financial.data,
    customers: customers.data,
    products: products.data,
    paymentMethods: paymentMethods.data,
    previousSales: previousSales.data,
    previousFinancial: previousFinancial.data,
    salesLoading: sales.isLoading,
    financialLoading: financial.isLoading,
    customersLoading: customers.isLoading,
    productsLoading: products.isLoading,
    paymentMethodsLoading: paymentMethods.isLoading,
    userName: user?.name?.split(' ')[0] ?? 'User',
  };
}
