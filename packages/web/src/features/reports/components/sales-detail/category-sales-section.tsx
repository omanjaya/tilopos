import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/format';
import { reportsApi } from '@/api/endpoints/reports.api';

interface CategorySalesSectionProps {
  outletId: string;
  startDate: string;
  endDate: string;
}

export function CategorySalesSection({ outletId, startDate, endDate }: CategorySalesSectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['report', 'dashboard-items', outletId, startDate, endDate],
    queryFn: () => reportsApi.dashboardItems({ outletId, startDate, endDate }),
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

  if (!data || !data.categoryBySales.length) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Tidak ada data kategori untuk periode ini</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-base font-semibold">Kategori berdasarkan Penjualan</h3>
        <div className="rounded-lg border bg-card">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <span>Kategori</span>
            <span className="text-right">Penjualan</span>
            <span className="text-right">%</span>
          </div>
          {data.categoryBySales.map((c) => (
            <div key={c.category} className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b px-4 py-2.5 last:border-0">
              <span className="text-sm">{c.category || 'Tanpa Kategori'}</span>
              <span className="text-right text-sm tabular-nums">{formatCurrency(c.totalSales)}</span>
              <span className="text-right text-sm tabular-nums text-muted-foreground">{formatPercentage(c.percentage)}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-base font-semibold">Kategori berdasarkan Volume</h3>
        <div className="rounded-lg border bg-card">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <span>Kategori</span>
            <span className="text-right">Qty</span>
            <span className="text-right">%</span>
          </div>
          {data.categoryByVolume.map((c) => (
            <div key={c.category} className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b px-4 py-2.5 last:border-0">
              <span className="text-sm">{c.category || 'Tanpa Kategori'}</span>
              <span className="text-right text-sm tabular-nums">{formatNumber(c.totalQuantity)}</span>
              <span className="text-right text-sm tabular-nums text-muted-foreground">{formatPercentage(c.percentage)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
