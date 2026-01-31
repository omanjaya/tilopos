import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { reportsApi } from '@/api/endpoints/reports.api';
import { DataTable } from '@/components/shared/data-table';
import type { Column } from '@/components/shared/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButtons } from '@/components/shared/export-buttons';
import { DataTimestamp } from '@/components/shared/data-timestamp';
import { ReportErrorState } from '@/components/shared/report-error-state';
import { ReportEmptyState } from '@/components/shared/report-empty-state';
import { CalculationHelp } from '@/components/shared/calculation-help';
import { formatCurrency } from '@/lib/format';
import { formatProductDataForExport, generateFilename } from '@/lib/export-utils';
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
import type { DateRange as DateRangeValue } from '@/components/shared/date-range-picker';

interface ProductReportProps {
  outletId: string;
  dateRange: DateRange;
  customDateRange?: DateRangeValue;
}

const columns: Column<ProductSales>[] = [
  {
    key: 'productId',
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

export function ProductReport({ outletId, dateRange, customDateRange }: ProductReportProps) {
  // Format custom date range for API
  const startDate = customDateRange?.from
    ? format(customDateRange.from, 'yyyy-MM-dd')
    : undefined;
  const endDate = customDateRange?.to
    ? format(customDateRange.to, 'yyyy-MM-dd')
    : undefined;

  const { data: productReport, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['reports', 'products', outletId, dateRange, startDate, endDate],
    queryFn: () => reportsApi.products({ outletId, dateRange, startDate, endDate }),
    enabled: !!outletId && (dateRange !== 'custom' || (!!startDate && !!endDate)),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const topProducts = productReport?.topProducts ?? [];
  const chartData = topProducts.slice(0, 10);

  // Prepare export data
  const exportData = productReport
    ? formatProductDataForExport({
        topProducts: topProducts.map((p) => ({
          productName: p.name,
          quantity: p.quantitySold,
          revenue: p.revenue,
        })),
        totalProducts: productReport.totalProducts,
        totalQuantitySold: productReport.totalQuantitySold,
      })
    : { headers: [], data: [], summary: [] };

  const filename = generateFilename('laporan_produk', dateRange, outletId);
  const hasData = productReport && productReport.totalProducts > 0;

  return (
    <div className="space-y-6">
      {/* Error State */}
      {error && (
        <ReportErrorState
          title="Gagal memuat laporan produk"
          description="Terjadi kesalahan saat mengambil data laporan produk."
          error={error as Error}
          onRetry={() => refetch()}
        />
      )}

      {/* Export Buttons & Data Timestamp */}
      {!isLoading && productReport && !error && (
        <div className="flex justify-between items-center">
          <DataTimestamp timestamp={new Date(dataUpdatedAt)} />
          <ExportButtons
            title="Laporan Produk"
            headers={exportData.headers}
            data={exportData.data}
            filename={filename}
            summary={exportData.summary}
          />
        </div>
      )}

      {!hasData && !isLoading && !error ? (
        <ReportEmptyState
          title="Belum ada penjualan produk"
          description="Belum ada produk yang terjual untuk periode ini."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">Total Produk Terjual</p>
                      <CalculationHelp
                        title="Total Produk Terjual"
                        formula="COUNT(DISTINCT product_id)"
                        description="Jumlah jenis produk yang berbeda yang terjual pada periode ini."
                      />
                    </div>
                    <p className="text-2xl font-bold">{String(productReport?.totalProducts ?? 0)}</p>
                  </div>
                </CardContent>
              </Card>
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

          {hasData && (
            <>
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
            </>
          )}
        </>
      )}
    </div>
  );
}
