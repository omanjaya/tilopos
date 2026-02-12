import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/format';
import { reportsApi } from '@/api/endpoints/reports.api';

interface SummarySectionProps {
  outletId: string;
  startDate: string;
  endDate: string;
}

function Row({ label, value, isBold, isNegative }: { label: string; value: string; isBold?: boolean; isNegative?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2.5 ${isBold ? 'border-t font-semibold' : ''}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm tabular-nums ${isNegative ? 'text-red-600 dark:text-red-400' : ''} ${isBold ? 'font-semibold' : ''}`}>
        {value}
      </span>
    </div>
  );
}

export function SummarySection({ outletId, startDate, endDate }: SummarySectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['report', 'sales-summary', outletId, startDate, endDate],
    queryFn: () => reportsApi.salesSummary({ outletId, startDate, endDate }),
    enabled: !!outletId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    );
  }

  if (!data) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Tidak ada data penjualan untuk periode ini</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-base font-semibold">Ringkasan Penjualan</h3>
        <div className="divide-y rounded-lg border bg-card p-4">
          <Row label="Penjualan Kotor" value={formatCurrency(data.grossSales)} />
          <Row label="Diskon" value={`-${formatCurrency(data.discountAmount)}`} isNegative />
          <Row label="Refund" value={`-${formatCurrency(data.refundAmount)}`} isNegative />
          <Row label="Penjualan Bersih" value={formatCurrency(data.netSales)} isBold />
          <Row label="Pajak" value={formatCurrency(data.taxAmount)} />
          <Row label="Service Charge" value={formatCurrency(data.serviceCharge)} />
          <Row label="Pembulatan" value={formatCurrency(data.roundingAmount)} />
          <Row label="Total Diterima" value={formatCurrency(data.totalCollected)} isBold />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-base font-semibold">Statistik</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Transaksi</p>
            <p className="mt-1 text-xl font-semibold">{formatNumber(data.totalTransactions)}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Rata-rata per Transaksi</p>
            <p className="mt-1 text-xl font-semibold">{formatCurrency(data.averageOrderValue)}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Transaksi Refund</p>
            <p className="mt-1 text-xl font-semibold">{formatNumber(data.refundTransactions)}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Refund</p>
            <p className="mt-1 text-xl font-semibold text-red-600 dark:text-red-400">{formatCurrency(data.refundAmount)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
