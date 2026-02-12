import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/format';
import { reportsApi } from '@/api/endpoints/reports.api';

interface PaymentMethodsSectionProps {
  outletId: string;
  startDate: string;
  endDate: string;
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Tunai',
  debit: 'Kartu Debit',
  credit: 'Kartu Kredit',
  qris: 'QRIS',
  transfer: 'Transfer Bank',
  ewallet: 'E-Wallet',
  other: 'Lainnya',
};

export function PaymentMethodsSection({ outletId, startDate, endDate }: PaymentMethodsSectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['report', 'payment-methods', outletId, startDate, endDate],
    queryFn: () => reportsApi.paymentMethods({ outletId, dateRange: 'custom', startDate, endDate }),
    enabled: !!outletId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }

  if (!data || !data.methods.length) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Tidak ada data pembayaran untuk periode ini</div>;
  }

  return (
    <div>
      <h3 className="mb-3 text-base font-semibold">Metode Pembayaran</h3>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Pembayaran</p>
          <p className="mt-1 text-xl font-semibold">{formatCurrency(data.totalAmount)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Transaksi</p>
          <p className="mt-1 text-xl font-semibold">{formatNumber(data.totalTransactions)}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-b px-4 py-2.5 text-xs font-medium text-muted-foreground">
          <span>Metode</span>
          <span className="text-right">Transaksi</span>
          <span className="text-right">Jumlah</span>
          <span className="text-right">%</span>
        </div>
        {data.methods.map((m) => (
          <div key={m.method} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-b px-4 py-2.5 last:border-0">
            <span className="text-sm">{METHOD_LABELS[m.method] || m.method}</span>
            <span className="text-right text-sm tabular-nums text-muted-foreground">{formatNumber(m.count)}</span>
            <span className="text-right text-sm tabular-nums">{formatCurrency(m.amount)}</span>
            <span className="text-right text-sm tabular-nums text-muted-foreground">{formatPercentage(m.percentage)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
