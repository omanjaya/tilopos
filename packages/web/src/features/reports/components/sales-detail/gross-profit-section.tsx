import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatPercentage } from '@/lib/format';
import { reportsApi } from '@/api/endpoints/reports.api';

interface GrossProfitSectionProps {
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

export function GrossProfitSection({ outletId, startDate, endDate }: GrossProfitSectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['report', 'financial', outletId, startDate, endDate],
    queryFn: () => reportsApi.financial({ outletId, dateRange: 'custom', startDate, endDate }),
    enabled: !!outletId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    );
  }

  if (!data) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Tidak ada data laba untuk periode ini</div>;
  }

  return (
    <div>
      <h3 className="mb-3 text-base font-semibold">Laba Kotor</h3>
      <div className="divide-y rounded-lg border bg-card p-4">
        <Row label="Total Pendapatan" value={formatCurrency(data.totalRevenue)} />
        <Row label="Harga Pokok (COGS)" value={formatCurrency(data.totalCost)} />
        <Row label="Laba Kotor" value={formatCurrency(data.grossProfit)} isBold />
        <Row label="Margin Kotor" value={formatPercentage(data.grossMargin)} />
      </div>
    </div>
  );
}
