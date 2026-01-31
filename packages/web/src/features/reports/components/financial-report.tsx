import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { reportsApi } from '@/api/endpoints/reports.api';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButtons } from '@/components/shared/export-buttons';
import { DataTimestamp } from '@/components/shared/data-timestamp';
import { ReportErrorState } from '@/components/shared/report-error-state';
import { CalculationHelp } from '@/components/shared/calculation-help';
import { formatCurrency } from '@/lib/format';
import { formatFinancialDataForExport, generateFilename } from '@/lib/export-utils';
import { DollarSign, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import type { DateRange } from '@/types/report.types';
import type { DateRange as DateRangeValue } from '@/components/shared/date-range-picker';

interface FinancialReportProps {
  outletId: string;
  dateRange: DateRange;
  customDateRange?: DateRangeValue;
}

export function FinancialReport({ outletId, dateRange, customDateRange }: FinancialReportProps) {
  // Format custom date range for API
  const startDate = customDateRange?.from
    ? format(customDateRange.from, 'yyyy-MM-dd')
    : undefined;
  const endDate = customDateRange?.to
    ? format(customDateRange.to, 'yyyy-MM-dd')
    : undefined;

  const { data: financialReport, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['reports', 'financial', outletId, dateRange, startDate, endDate],
    queryFn: () => reportsApi.financial({ outletId, dateRange, startDate, endDate }),
    enabled: !!outletId && (dateRange !== 'custom' || (!!startDate && !!endDate)),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Note: Previous period comparison removed in favor of calculation help tooltips
  // This simplifies the UI while providing better context through inline help

  // Prepare export data
  const exportData = financialReport
    ? formatFinancialDataForExport({
        totalRevenue: financialReport.totalRevenue,
        totalCost: financialReport.totalCost,
        grossProfit: financialReport.grossProfit ?? 0,
        grossMargin: financialReport.grossMargin ?? 0,
      })
    : { headers: [], data: [], summary: [] };

  const filename = generateFilename('laporan_keuangan', dateRange, outletId);

  return (
    <div className="space-y-6">
      {/* Error State */}
      {error && (
        <ReportErrorState
          title="Gagal memuat laporan keuangan"
          description="Terjadi kesalahan saat mengambil data laporan keuangan."
          error={error as Error}
          onRetry={() => refetch()}
        />
      )}

      {/* Export Buttons & Data Timestamp */}
      {!isLoading && financialReport && !error && (
        <div className="flex justify-between items-center">
          <DataTimestamp timestamp={new Date(dataUpdatedAt)} />
          <ExportButtons
            title="Laporan Keuangan"
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
        ) : (
          <>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Pendapatan</p>
                    <CalculationHelp
                      title="Pendapatan"
                      formula="Total Penjualan - Refund"
                      description="Total pendapatan dari semua transaksi penjualan setelah dikurangi refund."
                    />
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(financialReport?.totalRevenue ?? 0)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingDown className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">HPP (Cost)</p>
                    <CalculationHelp
                      title="Harga Pokok Penjualan"
                      formula="Σ (Cost Price × Quantity)"
                      description="Total biaya produk yang terjual berdasarkan harga pokok per item."
                    />
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(financialReport?.totalCost ?? 0)}</p>
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
                    <p className="text-sm text-muted-foreground">Laba Kotor</p>
                    <CalculationHelp
                      title="Laba Kotor"
                      formula="Pendapatan - HPP"
                      description="Keuntungan sebelum dikurangi biaya operasional lainnya."
                    />
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(financialReport?.grossProfit ?? 0)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Percent className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Margin</p>
                    <CalculationHelp
                      title="Margin Laba Kotor"
                      formula="(Laba Kotor / Pendapatan) × 100%"
                      description="Persentase keuntungan dari setiap rupiah penjualan."
                    />
                  </div>
                  <p className="text-2xl font-bold">{Number(financialReport?.grossMargin ?? 0).toFixed(1)}%</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
