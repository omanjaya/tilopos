import { formatCurrency, formatNumber } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign,
  Receipt,
  TrendingUp,
  ShoppingCart,
  Calculator,
  Percent,
} from 'lucide-react';
import type { DashboardSummary } from '@/types/report.types';

interface SalesSummaryGridProps {
  data?: DashboardSummary;
  isLoading: boolean;
}

const kpis = [
  { key: 'grossSales', label: 'Penjualan Kotor', icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/40', format: 'currency' },
  { key: 'netSales', label: 'Penjualan Bersih', icon: Receipt, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/40', format: 'currency' },
  { key: 'grossProfit', label: 'Laba Kotor', icon: TrendingUp, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/40', format: 'currency' },
  { key: 'transactions', label: 'Transaksi', icon: ShoppingCart, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/40', format: 'number' },
  { key: 'averageSalePerTransaction', label: 'Rata-rata / Transaksi', icon: Calculator, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900/40', format: 'currency' },
  { key: 'grossMargin', label: 'Margin Kotor', icon: Percent, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/40', format: 'percent' },
] as const;

export function SalesSummaryGrid({ data, isLoading }: SalesSummaryGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/50 bg-white/80 dark:bg-card/80 p-4">
            <Skeleton className="h-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {kpis.map((kpi) => {
        const raw = data?.[kpi.key] ?? 0;
        let display: string;
        if (kpi.format === 'currency') display = formatCurrency(raw);
        else if (kpi.format === 'percent') display = `${raw.toFixed(1)}%`;
        else display = formatNumber(raw);

        const Icon = kpi.icon;
        return (
          <div
            key={kpi.key}
            className="rounded-2xl border border-border/50 bg-white/80 dark:bg-card/80 backdrop-blur-sm shadow-sm p-4 transition-all duration-300 hover:shadow-md"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`rounded-lg p-2 ${kpi.bg}`}>
                <Icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="text-lg font-bold tracking-tight">{display}</p>
          </div>
        );
      })}
    </div>
  );
}
