import { Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ProductSales } from '@/types/report.types';

interface TopProductsProps {
  products: ProductSales[];
  isLoading: boolean;
  className?: string;
}

const RANK_COLORS = [
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
];

export function TopProducts({ products, isLoading, className }: TopProductsProps) {
  const top5 = products.slice(0, 5);
  const maxRevenue = top5.length > 0 ? Math.max(...top5.map((p) => p.revenue)) : 0;

  return (
    <div
      className={cn(
        'rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm',
        'border border-border/50 dark:border-white/[0.06]',
        'shadow-sm p-6',
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <h3 className="font-semibold">Produk Terlaris</h3>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-4 w-full max-w-[200px]" />
              <Skeleton className="h-3 w-20 ml-auto" />
            </div>
          ))}
        </div>
      ) : top5.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Belum ada data produk</p>
      ) : (
        <div className="space-y-3">
          {top5.map((product, i) => {
            const barWidth = maxRevenue > 0 ? (product.revenue / maxRevenue) * 100 : 0;

            return (
              <div key={product.productId} className="group">
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      RANK_COLORS[i] ?? 'bg-muted text-muted-foreground',
                    )}
                  >
                    {i + 1}
                  </div>

                  {/* Name + category */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      {product.category && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                          {product.category}
                        </Badge>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-1 h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/60 transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* Revenue + qty */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(product.revenue)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {product.quantitySold} terjual
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
