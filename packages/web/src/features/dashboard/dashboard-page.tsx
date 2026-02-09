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
import { FeatureGate, FEATURES } from '@/components/shared/feature-gate';
import { useBusinessFeatures } from '@/hooks/use-business-features';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
  LayoutGrid,
  CalendarClock,
  Package,
  ChefHat
} from 'lucide-react';
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

  // Business type checks for dynamic dashboard
  const { isFnB, isService, isRetail } = useBusinessFeatures();

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

      {/* F&B Specific Metrics */}
      <FeatureGate feature={[FEATURES.TABLE_MANAGEMENT, FEATURES.KITCHEN_DISPLAY]}>
        {isFnB && !isLoading && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4">
            <FeatureGate feature={FEATURES.TABLE_MANAGEMENT}>
              <MetricCard
                title="Meja Terisi"
                value="8/12"
                icon={LayoutGrid}
                className="bg-orange-50 dark:bg-orange-950/20"
              />
            </FeatureGate>
            <FeatureGate feature={FEATURES.KITCHEN_DISPLAY}>
              <MetricCard
                title="Pesanan Dimasak"
                value="5"
                icon={ChefHat}
                className="bg-amber-50 dark:bg-amber-950/20"
              />
            </FeatureGate>
            <FeatureGate feature={FEATURES.WAITING_LIST}>
              <MetricCard
                title="Dalam Antrian"
                value="3"
                icon={Users}
                className="bg-blue-50 dark:bg-blue-950/20"
              />
            </FeatureGate>
          </div>
        )}
      </FeatureGate>

      {/* Service Specific Metrics */}
      <FeatureGate feature={FEATURES.APPOINTMENTS}>
        {isService && !isLoading && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4">
            <MetricCard
              title="Jadwal Hari Ini"
              value="8"
              icon={CalendarClock}
              className="bg-purple-50 dark:bg-purple-950/20"
            />
            <MetricCard
              title="Selesai"
              value="5"
              icon={TrendingUp}
              className="bg-green-50 dark:bg-green-950/20"
            />
            <MetricCard
              title="Dalam Progress"
              value="2"
              icon={Users}
              className="bg-blue-50 dark:bg-blue-950/20"
            />
          </div>
        )}
      </FeatureGate>

      {/* Retail Specific Metrics */}
      <FeatureGate feature={FEATURES.STOCK_MANAGEMENT}>
        {isRetail && !isLoading && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4">
            <MetricCard
              title="Stok Rendah"
              value="12"
              icon={Package}
              className="bg-red-50 dark:bg-red-950/20"
            />
            <MetricCard
              title="Produk Terlaris"
              value="Coca Cola"
              icon={TrendingUp}
              className="bg-green-50 dark:bg-green-950/20"
            />
          </div>
        )}
      </FeatureGate>

      {salesLoading ? (
        <ChartSkeleton height={300} />
      ) : (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Penjualan</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="h-[250px] w-full md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesReport?.salesByDate ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickMargin={10}
                    stroke="hsl(var(--border))"
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickFormatter={(v: number) => formatCurrency(v)}
                    width={70}
                    tickMargin={5}
                    stroke="hsl(var(--border))"
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Penjualan']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    cursor={{ fill: 'hsl(var(--muted)/0.1)' }}
                  />
                  <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
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
