import { DollarSign, TrendingUp, Percent } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendIndicator } from '@/components/shared/trend-indicator';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { FinancialReport } from '@/types/report.types';

interface FinancialSummaryProps {
  financial: FinancialReport | undefined;
  previousFinancial: FinancialReport | undefined;
  isLoading: boolean;
  className?: string;
}

const METRICS = [
  {
    key: 'totalRevenue' as const,
    prevKey: 'totalRevenue' as const,
    label: 'Pendapatan',
    icon: DollarSign,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    format: formatCurrency,
  },
  {
    key: 'grossProfit' as const,
    prevKey: 'grossProfit' as const,
    label: 'Laba Kotor',
    icon: TrendingUp,
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    format: formatCurrency,
  },
  {
    key: 'grossMargin' as const,
    prevKey: 'grossMargin' as const,
    label: 'Margin',
    icon: Percent,
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    format: (v: number) => `${v.toFixed(1)}%`,
  },
];

export function FinancialSummary({ financial, previousFinancial, isLoading, className }: FinancialSummaryProps) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm',
        'border border-border/50 dark:border-white/[0.06]',
        'shadow-sm p-6',
        className,
      )}
    >
      <h3 className="font-semibold mb-4">Ringkasan Keuangan</h3>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : financial ? (
        <div className="space-y-3">
          {METRICS.map((m) => (
            <div
              key={m.key}
              className="flex items-center justify-between p-3 rounded-xl bg-muted/30 dark:bg-muted/10"
            >
              <div className="flex items-center gap-3">
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', m.iconBg)}>
                  <m.icon className={cn('h-4 w-4', m.iconColor)} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-sm font-semibold">{m.format(financial[m.key])}</p>
                </div>
              </div>
              {previousFinancial && (
                <TrendIndicator
                  current={financial[m.key]}
                  previous={previousFinancial[m.prevKey]}
                  hideLabel
                  className="text-xs"
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Belum ada data keuangan</p>
      )}
    </div>
  );
}
