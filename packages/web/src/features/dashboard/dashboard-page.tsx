import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/api/endpoints/reports.api';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { PageHeader } from '@/components/shared/page-header';
import { MetricCard } from '@/components/shared/metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
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

  const { data: salesReport, isLoading: salesLoading } = useQuery({
    queryKey: ['reports', 'sales', outletId, dateRange],
    queryFn: () => reportsApi.sales({ outletId, dateRange }),
    enabled: !!outletId,
  });

  const { data: financialReport, isLoading: financialLoading } = useQuery({
    queryKey: ['reports', 'financial', outletId, dateRange],
    queryFn: () => reportsApi.financial({ outletId, dateRange }),
    enabled: !!outletId,
  });

  const { data: customerReport, isLoading: customerLoading } = useQuery({
    queryKey: ['reports', 'customers', outletId, dateRange],
    queryFn: () => reportsApi.customers({ outletId, dateRange }),
    enabled: !!outletId,
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Penjualan</CardTitle>
        </CardHeader>
        <CardContent>
          {salesLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesReport?.salesByDate ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v: number) => formatCurrency(v)} />
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
          )}
        </CardContent>
      </Card>

      {financialReport && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
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
          />
        </div>
      )}
    </div>
  );
}
