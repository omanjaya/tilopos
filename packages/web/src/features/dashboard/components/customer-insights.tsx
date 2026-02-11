import { Users, UserPlus, UserCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CustomerReport } from '@/types/report.types';

interface CustomerInsightsProps {
  customers: CustomerReport | undefined;
  isLoading: boolean;
  className?: string;
}

export function CustomerInsights({ customers, isLoading, className }: CustomerInsightsProps) {
  const total = customers?.totalCustomers ?? 0;
  const newCount = customers?.newCustomers ?? 0;
  const returning = customers?.returningCustomers ?? 0;
  const newPct = total > 0 ? (newCount / total) * 100 : 0;
  const retPct = total > 0 ? (returning / total) * 100 : 0;

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
        <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        <h3 className="font-semibold">Insight Pelanggan</h3>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {/* New vs Returning bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Baru ({newCount})</span>
              <span>Kembali ({returning})</span>
            </div>
            <div className="h-3 rounded-full bg-muted/40 overflow-hidden flex">
              <div
                className="h-full bg-violet-500 dark:bg-violet-400 rounded-l-full transition-all duration-500"
                style={{ width: `${newPct}%` }}
              />
              <div
                className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-r-full transition-all duration-500"
                style={{ width: `${retPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-violet-500" />
                <span className="text-xs text-muted-foreground">{newPct.toFixed(0)}% baru</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-muted-foreground">{retPct.toFixed(0)}% kembali</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/20">
              <UserPlus className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <div>
                <p className="text-lg font-bold">{newCount}</p>
                <p className="text-[10px] text-muted-foreground leading-none">Pelanggan Baru</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
              <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-lg font-bold">{returning}</p>
                <p className="text-[10px] text-muted-foreground leading-none">Pelanggan Setia</p>
              </div>
            </div>
          </div>

          {/* Top customers */}
          {customers?.topCustomers && customers.topCustomers.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Top Pelanggan</p>
              <div className="space-y-2">
                {customers.topCustomers.slice(0, 3).map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                        {i + 1}
                      </div>
                      <span className="text-sm truncate max-w-[120px]">{c.name}</span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {formatCurrency(c.totalSpent)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
