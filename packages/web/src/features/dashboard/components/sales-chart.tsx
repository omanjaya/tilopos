import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SalesByDate } from '@/types/report.types';

interface SalesTrendChartProps {
  data: SalesByDate[];
  isLoading: boolean;
  className?: string;
}

export function SalesTrendChart({ data, isLoading, className }: SalesTrendChartProps) {
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
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <h3 className="font-semibold">Tren Penjualan</h3>
      </div>

      {isLoading ? (
        <Skeleton className="h-[320px] w-full rounded-xl" />
      ) : data.length === 0 ? (
        <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
          Belum ada data penjualan
        </div>
      ) : (
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border/30"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickMargin={10}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickFormatter={(v: number) => {
                  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                  return String(v);
                }}
                width={60}
                tickMargin={5}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Penjualan']}
                labelFormatter={(label: string) => `Tanggal: ${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  padding: '12px 16px',
                }}
                cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#salesGradient)"
                dot={false}
                activeDot={{
                  r: 5,
                  strokeWidth: 2,
                  stroke: 'hsl(var(--primary))',
                  fill: 'hsl(var(--card))',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
