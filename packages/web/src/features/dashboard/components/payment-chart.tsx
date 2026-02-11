import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CreditCard } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PaymentMethodBreakdown } from '@/types/report.types';

const DONUT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4', '#f97316'];

const METHOD_LABELS: Record<string, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  debit_card: 'Debit',
  credit_card: 'Kredit',
  gopay: 'GoPay',
  ovo: 'OVO',
  dana: 'DANA',
  shopeepay: 'ShopeePay',
  linkaja: 'LinkAja',
  bank_transfer: 'Transfer',
};

interface PaymentChartProps {
  data: PaymentMethodBreakdown[];
  totalAmount: number;
  isLoading: boolean;
  className?: string;
}

export function PaymentChart({ data, totalAmount, isLoading, className }: PaymentChartProps) {
  const methods = data.slice(0, 7);

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
        <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <h3 className="font-semibold">Metode Pembayaran</h3>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-[160px] w-[160px] rounded-full" />
          <div className="w-full space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      ) : methods.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Belum ada data pembayaran</p>
      ) : (
        <>
          {/* Donut */}
          <div className="relative mx-auto h-[170px] w-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={methods}
                  dataKey="amount"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  cornerRadius={4}
                  stroke="none"
                >
                  {methods.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-muted-foreground">Total</span>
              <span className="text-sm font-bold">
                {totalAmount >= 1000000
                  ? `${(totalAmount / 1000000).toFixed(1)}M`
                  : totalAmount >= 1000
                    ? `${(totalAmount / 1000).toFixed(0)}K`
                    : String(totalAmount)}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 space-y-2">
            {methods.map((m, i) => (
              <div key={m.method} className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                />
                <span className="text-xs flex-1 truncate">
                  {METHOD_LABELS[m.method] ?? m.method}
                </span>
                <span className="text-xs font-medium tabular-nums">
                  {formatCurrency(m.amount)}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">
                  {m.percentage.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
