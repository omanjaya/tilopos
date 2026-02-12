import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/format';
import { reportsApi } from '@/api/endpoints/reports.api';

interface ItemSalesSectionProps {
  outletId: string;
  startDate: string;
  endDate: string;
}

export function ItemSalesSection({ outletId, startDate, endDate }: ItemSalesSectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['report', 'products', outletId, startDate, endDate],
    queryFn: () => reportsApi.products({ outletId, dateRange: 'custom', startDate, endDate }),
    enabled: !!outletId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }

  if (!data || !data.topProducts.length) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Tidak ada data penjualan item untuk periode ini</div>;
  }

  return (
    <div>
      <h3 className="mb-3 text-base font-semibold">Penjualan per Item</h3>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Produk Terjual</p>
          <p className="mt-1 text-xl font-semibold">{formatNumber(data.totalProducts)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Qty Terjual</p>
          <p className="mt-1 text-xl font-semibold">{formatNumber(data.totalQuantitySold)}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-4 border-b px-4 py-2.5 text-xs font-medium text-muted-foreground">
          <span>#</span>
          <span>Produk</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Pendapatan</span>
        </div>
        {data.topProducts.map((p, i) => (
          <div key={p.productId} className="grid grid-cols-[auto_1fr_auto_auto] gap-x-4 border-b px-4 py-2.5 last:border-0">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm">{p.name}</p>
              {p.category && <p className="truncate text-xs text-muted-foreground">{p.category}</p>}
            </div>
            <span className="text-right text-sm tabular-nums text-muted-foreground">{formatNumber(p.quantitySold)}</span>
            <span className="text-right text-sm tabular-nums">{formatCurrency(p.revenue)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
