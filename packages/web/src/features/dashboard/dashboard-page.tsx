import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/api/endpoints/reports.api';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { PageHeader } from '@/components/shared/page-header';
import { MetricCard } from '@/components/shared/metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/format';
import { MetricCardsSkeleton, ChartSkeleton } from '@/components/shared/loading-skeletons';
import { DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DateRange } from '@/types/report.types';

export function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>('this_month');
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const user = useAuthStore((s) => s.user);
  const outletId = selectedOutletId ?? user?.outletId ?? '';

  // Check if user has access to reports (not cashier/kitchen)
  const hasReportsAccess = user?.role && ['owner', 'manager', 'supervisor'].includes(user.role);

  const { data: salesReport, isLoading: salesLoading } = useQuery({
    queryKey: ['reports', 'sales', outletId, dateRange],
    queryFn: () => reportsApi.sales({ outletId, dateRange }),
    enabled: !!outletId && hasReportsAccess,
  });

  const { data: financialReport, isLoading: financialLoading } = useQuery({
    queryKey: ['reports', 'financial', outletId, dateRange],
    queryFn: () => reportsApi.financial({ outletId, dateRange }),
    enabled: !!outletId && hasReportsAccess,
  });

  const { data: customerReport, isLoading: customerLoading } = useQuery({
    queryKey: ['reports', 'customers', outletId, dateRange],
    queryFn: () => reportsApi.customers({ outletId, dateRange }),
    enabled: !!outletId && hasReportsAccess,
  });

  const isLoading = salesLoading || financialLoading || customerLoading;

  return (
    <div>
      <PageHeader title="Dashboard" description="Ringkasan performa bisnis Anda">
        <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <TabsList>
            <TabsTrigger value="today">Hari Ini</TabsTrigger>
            <TabsTrigger value="this_week">Minggu Ini</TabsTrigger>
            <TabsTrigger value="this_month">Bulan Ini</TabsTrigger>
          </TabsList>
        </Tabs>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 md:gap-4">
        {isLoading ? (
          <MetricCardsSkeleton count={4} />
        ) : (
          <>
            <MetricCard
              title="Total Penjualan"
              value={formatCurrency(salesReport?.totalSales ?? 0)}
              icon={DollarSign}
            />
            <MetricCard
              title="Transaksi"
              value={String(salesReport?.totalTransactions ?? 0)}
              icon={ShoppingCart}
            />
            <MetricCard
              title="Rata-rata Order"
              value={formatCurrency(salesReport?.averageOrderValue ?? 0)}
              icon={TrendingUp}
            />
            <MetricCard
              title="Pelanggan"
              value={String(customerReport?.totalCustomers ?? 0)}
              icon={Users}
            />
          </>
        )}
      </div>

      {salesLoading ? (
        <ChartSkeleton height={300} />
      ) : (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Penjualan</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
              <BarChart data={salesReport?.salesByDate ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  className="text-[10px] md:text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickMargin={8}
                />
                <YAxis
                  className="text-[10px] md:text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v: number) => formatCurrency(v)}
                  width={60}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Penjualan']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {financialReport && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:mt-6 md:grid-cols-3 md:gap-4">
          <MetricCard
            title="Pendapatan"
            value={formatCurrency(financialReport.totalRevenue)}
            icon={DollarSign}
          />
          <MetricCard
            title="Laba Kotor"
            value={formatCurrency(financialReport.grossProfit)}
            icon={TrendingUp}
          />
          <MetricCard
            title="Margin"
            value={`${(financialReport.grossMargin ?? 0).toFixed(1)}%`}
            icon={TrendingUp}
            className="sm:col-span-2 md:col-span-1"
          />
        </div>
      )}
    </div>
  );
}
