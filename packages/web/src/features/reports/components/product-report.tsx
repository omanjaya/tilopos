import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/api/endpoints/reports.api';
import { MetricCard } from '@/components/shared/metric-card';
import { DataTable } from '@/components/shared/data-table';
import type { Column } from '@/components/shared/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { Package } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DateRange, ProductSales } from '@/types/report.types';

interface ProductReportProps {
  outletId: string;
  dateRange: DateRange;
}

const columns: Column<ProductSales>[] = [
  {
    key: 'name',
    header: 'Nama Produk',
    cell: (row) => <span className="font-medium">{row.name}</span>,
  },
  {
    key: 'category',
    header: 'Kategori',
    cell: (row) => row.category ?? '-',
  },
  {
    key: 'quantitySold',
    header: 'Qty Terjual',
    cell: (row) => row.quantitySold,
  },
  {
    key: 'revenue',
    header: 'Pendapatan',
    cell: (row) => formatCurrency(row.revenue),
  },
];

export function ProductReport({ outletId, dateRange }: ProductReportProps) {
  const { data: productReport, isLoading } = useQuery({
    queryKey: ['reports', 'products', outletId, dateRange],
    queryFn: () => reportsApi.products({ outletId, dateRange }),
    enabled: !!outletId,
  });

  const topProducts = productReport?.topProducts ?? [];
  const chartData = topProducts.slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ) : (
          <MetricCard
            title="Total Produk Terjual"
            value={String(productReport?.totalProducts ?? 0)}
            icon={Package}
          />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 10 Produk berdasarkan Pendapatan</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  type="number"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v: number) => formatCurrency(v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  width={150}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Pendapatan']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detail Produk</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={topProducts}
            isLoading={isLoading}
            emptyTitle="Tidak ada data produk"
            emptyDescription="Belum ada penjualan produk untuk periode ini."
          />
        </CardContent>
      </Card>
    </div>
  );
}
