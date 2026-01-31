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
import { formatPaymentDataForExport, generateFilename } from '@/lib/export-utils';
import { CreditCard } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { DateRange, PaymentMethodBreakdown } from '@/types/report.types';
import type { DateRange as DateRangeValue } from '@/components/shared/date-range-picker';

interface PaymentReportProps {
  outletId: string;
  dateRange: DateRange;
  customDateRange?: DateRangeValue;
}

const PIE_COLORS = [
  'hsl(var(--primary))',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
];

const columns: Column<PaymentMethodBreakdown>[] = [
  {
    key: 'method',
    header: 'Metode Bayar',
    cell: (row) => <span className="font-medium">{row.method}</span>,
  },
  {
    key: 'count',
    header: 'Jumlah Transaksi',
    cell: (row) => row.count,
  },
  {
    key: 'amount',
    header: 'Total',
    cell: (row) => formatCurrency(row.amount),
  },
  {
    key: 'percentage',
    header: 'Persentase',
    cell: (row) => `${Number(row.percentage ?? 0).toFixed(1)}%`,
  },
];

export function PaymentReport({ outletId, dateRange, customDateRange }: PaymentReportProps) {
  // Format custom date range for API
  const startDate = customDateRange?.from
    ? format(customDateRange.from, 'yyyy-MM-dd')
    : undefined;
  const endDate = customDateRange?.to
    ? format(customDateRange.to, 'yyyy-MM-dd')
    : undefined;

  const { data: paymentReport, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['reports', 'payment-methods', outletId, dateRange, startDate, endDate],
    queryFn: () => reportsApi.paymentMethods({ outletId, dateRange, startDate, endDate }),
    enabled: !!outletId && (dateRange !== 'custom' || (!!startDate && !!endDate)),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const methods = paymentReport?.methods ?? [];

  // Prepare export data
  const exportData = paymentReport
    ? formatPaymentDataForExport({
        paymentBreakdown: methods.map((m) => ({
          method: m.method,
          amount: m.amount,
          count: m.count,
        })),
        totalAmount: paymentReport.totalAmount,
        totalTransactions: paymentReport.totalTransactions,
      })
    : { headers: [], data: [], summary: [] };

  const filename = generateFilename('laporan_pembayaran', dateRange, outletId);
  const hasData = paymentReport && paymentReport.methods.length > 0;

  return (
    <div className="space-y-6">
      {/* Error State */}
      {error && (
        <ReportErrorState
          title="Gagal memuat laporan pembayaran"
          description="Terjadi kesalahan saat mengambil data laporan pembayaran."
          error={error as Error}
          onRetry={() => refetch()}
        />
      )}

      {/* Export Buttons & Data Timestamp */}
      {!isLoading && paymentReport && !error && (
        <div className="flex justify-between items-center">
          <DataTimestamp timestamp={new Date(dataUpdatedAt)} />
          <ExportButtons
            title="Laporan Pembayaran"
            headers={exportData.headers}
            data={exportData.data}
            filename={filename}
            summary={exportData.summary}
          />
        </div>
      )}

      {!hasData && !isLoading && !error ? (
        <ReportEmptyState
          title="Belum ada pembayaran"
          description="Belum ada transaksi pembayaran untuk periode ini."
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
                    <CreditCard className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">Total Pembayaran</p>
                      <CalculationHelp
                        title="Total Pembayaran"
                        formula="Σ Payment Amount"
                        description="Total nilai pembayaran yang diterima dari semua metode pembayaran."
                      />
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(paymentReport?.totalAmount ?? 0)}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribusi Metode Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={methods}
                  dataKey="percentage"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  outerRadius={150}
                  label={({ method, percentage }: { method: string; percentage: number }) =>
                    `${method} (${Number(percentage ?? 0).toFixed(1)}%)`
                  }
                >
                  {methods.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${Number(value ?? 0).toFixed(1)}%`, name]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

          {hasData && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Detail Metode Pembayaran</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={columns}
                    data={methods}
                    isLoading={isLoading}
                    emptyTitle="Tidak ada data pembayaran"
                    emptyDescription="Belum ada transaksi pembayaran untuk periode ini."
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
