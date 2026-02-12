import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/format';
import { reportsApi } from '@/api/endpoints/reports.api';

interface DiscountSectionProps {
  outletId: string;
  startDate: string;
  endDate: string;
}

function Row({ label, value, isBold }: { label: string; value: string; isBold?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2.5 ${isBold ? 'border-t font-semibold' : ''}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm tabular-nums ${isBold ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  );
}

export function DiscountSection({ outletId, startDate, endDate }: DiscountSectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['report', 'discount-breakdown', outletId, startDate, endDate],
    queryFn: () => reportsApi.discountBreakdown({ outletId, startDate, endDate }),
    enabled: !!outletId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    );
  }

  if (!data) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Tidak ada data diskon untuk periode ini</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-base font-semibold">Ringkasan Diskon</h3>
        <div className="divide-y rounded-lg border bg-card p-4">
          <Row label="Total Diskon" value={formatCurrency(data.totalDiscount)} isBold />
          <Row label="Diskon Transaksi" value={formatCurrency(data.transactionLevelDiscount)} />
          <Row label="Diskon Item" value={formatCurrency(data.itemLevelDiscount)} />
          <Row label="Transaksi dengan Diskon" value={formatNumber(data.transactionsWithDiscount)} />
          <Row label="Transaksi tanpa Diskon" value={formatNumber(data.transactionsWithoutDiscount)} />
        </div>
      </div>

      {data.promotionBreakdown.length > 0 && (
        <div>
          <h3 className="mb-3 text-base font-semibold">Detail Promosi</h3>
          <div className="rounded-lg border bg-card">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b px-4 py-2.5 text-xs font-medium text-muted-foreground">
              <span>Promosi</span>
              <span className="text-right">Digunakan</span>
              <span className="text-right">Total Diskon</span>
            </div>
            {data.promotionBreakdown.map((p) => (
              <div key={p.promotionId} className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b px-4 py-2.5 last:border-0">
                <span className="text-sm">{p.name}</span>
                <span className="text-right text-sm tabular-nums text-muted-foreground">{formatNumber(p.usedCount)}x</span>
                <span className="text-right text-sm tabular-nums">{formatCurrency(p.totalDiscount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
