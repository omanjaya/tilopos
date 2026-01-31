import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { reportsApi } from '@/api/endpoints/reports.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButtons } from '@/components/shared/export-buttons';
import { DataTimestamp } from '@/components/shared/data-timestamp';
import { ReportErrorState } from '@/components/shared/report-error-state';
import { ReportEmptyState } from '@/components/shared/report-empty-state';
import { CalculationHelp } from '@/components/shared/calculation-help';
import { formatCurrency } from '@/lib/format';
import { formatSalesDataForExport, generateFilename } from '@/lib/export-utils';
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
import type { DateRange as DateRangeValue } from '@/components/shared/date-range-picker';

interface SalesReportProps {
  outletId: string;
  dateRange: DateRange;
  customDateRange?: DateRangeValue;
}

export function SalesReport({ outletId, dateRange, customDateRange }: SalesReportProps) {
  // Format custom date range for API
  const startDate = customDateRange?.from
    ? format(customDateRange.from, 'yyyy-MM-dd')
    : undefined;
  const endDate = customDateRange?.to
    ? format(customDateRange.to, 'yyyy-MM-dd')
    : undefined;

  const { data: salesReport, isLoading: salesLoading, error: salesError, refetch: refetchSales, dataUpdatedAt: salesUpdatedAt } = useQuery({
    queryKey: ['reports', 'sales', outletId, dateRange, startDate, endDate],
    queryFn: () => reportsApi.sales({ outletId, dateRange, startDate, endDate }),
    enabled: !!outletId && (dateRange !== 'custom' || (!!startDate && !!endDate)),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: customerReport, isLoading: customerLoading, error: customerError, refetch: refetchCustomers } = useQuery({
    queryKey: ['reports', 'customers', outletId, dateRange, startDate, endDate],
    queryFn: () => reportsApi.customers({ outletId, dateRange, startDate, endDate }),
    enabled: !!outletId && (dateRange !== 'custom' || (!!startDate && !!endDate)),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  // Note: Previous period comparison removed in favor of calculation help tooltips

  const isLoading = salesLoading || customerLoading;
  const hasError = salesError || customerError;

  // Prepare export data
  const exportData = salesReport
    ? formatSalesDataForExport(salesReport)
    : { headers: [], data: [], summary: [] };

  const filename = generateFilename('laporan_penjualan', dateRange, outletId);

  const hasData = salesReport && salesReport.totalTransactions > 0;

  return (
    <div className="space-y-6">
      {/* Error State */}
      {hasError && (
        <ReportErrorState
          title="Gagal memuat laporan penjualan"
          description="Terjadi kesalahan saat mengambil data laporan penjualan."
          error={(salesError || customerError) as Error}
          onRetry={() => {
            refetchSales();
            refetchCustomers();
          }}
        />
      )}

      {/* Export Buttons & Data Timestamp */}
      {!isLoading && salesReport && !hasError && (
        <div className="flex justify-between items-center">
          <DataTimestamp timestamp={new Date(salesUpdatedAt)} />
          <ExportButtons
            title="Laporan Penjualan"
            headers={exportData.headers}
            data={exportData.data}
            filename={filename}
            summary={exportData.summary}
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : !hasData && !isLoading ? (
          <div className="col-span-full">
            <ReportEmptyState
              title="Belum ada penjualan"
              description="Belum ada transaksi penjualan untuk periode ini."
            />
          </div>
        ) : (
          <>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Total Penjualan</p>
                    <CalculationHelp
                      title="Total Penjualan"
                      formula="Σ Grand Total (All Transactions)"
                      description="Total nilai dari semua transaksi penjualan yang telah selesai."
                    />
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(salesReport?.totalSales ?? 0)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <ShoppingCart className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Transaksi</p>
                    <CalculationHelp
                      title="Total Transaksi"
                      formula="COUNT(Transactions)"
                      description="Jumlah total transaksi penjualan yang telah diselesaikan."
                    />
                  </div>
                  <p className="text-2xl font-bold">{String(salesReport?.totalTransactions ?? 0)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Rata-rata Order</p>
                    <CalculationHelp
                      title="Average Order Value (AOV)"
                      formula="Total Penjualan / Jumlah Transaksi"
                      description="Rata-rata nilai per transaksi, menunjukkan berapa banyak customer menghabiskan per pembelian."
                    />
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(salesReport?.averageOrderValue ?? 0)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Pelanggan</p>
                    <CalculationHelp
                      title="Total Pelanggan"
                      formula="COUNT(DISTINCT customer_id)"
                      description="Jumlah pelanggan unik yang melakukan transaksi pada periode ini."
                    />
                  </div>
                  <p className="text-2xl font-bold">{String(customerReport?.totalCustomers ?? 0)}</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {hasData && (
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
      )}
    </div>
  );
}
