import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/api/endpoints/reports.api';
import { MetricCard } from '@/components/shared/metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface SalesReportProps {
  outletId: string;
  dateRange: DateRange;
}

export function SalesReport({ outletId, dateRange }: SalesReportProps) {
  const { data: salesReport, isLoading: salesLoading } = useQuery({
    queryKey: ['reports', 'sales', outletId, dateRange],
    queryFn: () => reportsApi.sales({ outletId, dateRange }),
    enabled: !!outletId,
  });

  const { data: customerReport, isLoading: customerLoading } = useQuery({
    queryKey: ['reports', 'customers', outletId, dateRange],
    queryFn: () => reportsApi.customers({ outletId, dateRange }),
    enabled: !!outletId,
  });

  const isLoading = salesLoading || customerLoading;

  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle>Penjualan per Hari</CardTitle>
        </CardHeader>
        <CardContent>
          {salesLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={salesReport?.salesByDate ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v: number) => formatCurrency(v)}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
