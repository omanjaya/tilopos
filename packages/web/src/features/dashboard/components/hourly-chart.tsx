import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import type { HourlySales } from '@/types/report.types';

interface HourlyChartProps {
  data?: HourlySales[];
  isLoading: boolean;
  className?: string;
}

export function HourlyChart({ data, isLoading, className }: HourlyChartProps) {
  if (isLoading) {
    return (
      <div className={`rounded-2xl border border-border/50 bg-white/80 dark:bg-card/80 backdrop-blur-sm shadow-sm p-5 ${className}`}>
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-[220px] w-full rounded-xl" />
      </div>
    );
  }

  const chartData = data ?? [];

  return (
    <div className={`rounded-2xl border border-border/50 bg-white/80 dark:bg-card/80 backdrop-blur-sm shadow-sm p-5 ${className}`}>
      <h3 className="text-sm font-semibold mb-4">Penjualan per Jam</h3>
      {chartData.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-10">Belum ada data</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barCategoryGap="10%">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              tickFormatter={(v: number) => `${String(v).padStart(2, '0')}`}
              axisLine={false}
              tickLine={false}
              interval={2}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickFormatter={(v: number) => {
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                return String(v);
              }}
              width={50}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => [
                name === 'grossSales' ? formatCurrency(value) : value,
                name === 'grossSales' ? 'Penjualan' : 'Transaksi',
              ]}
              labelFormatter={(label: number) => `${String(label).padStart(2, '0')}:00`}
            />
            <Bar
              dataKey="grossSales"
              fill="hsl(var(--chart-2))"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
