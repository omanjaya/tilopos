import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/format';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import type { OutletComparison } from '@/types/report.types';

const OUTLET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4', '#f97316'];

interface OutletComparisonSectionProps {
  data?: OutletComparison;
  isLoading: boolean;
  className?: string;
}

export function OutletComparisonSection({ data, isLoading, className }: OutletComparisonSectionProps) {
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className ?? ''}`}>
        <div className="rounded-2xl border border-border/50 bg-white/80 dark:bg-card/80 p-5">
          <Skeleton className="h-5 w-48 mb-4" />
          <Skeleton className="h-[200px] w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border border-border/50 bg-white/80 dark:bg-card/80 p-5">
          <Skeleton className="h-5 w-48 mb-4" />
          <Skeleton className="h-[280px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const outlets = data?.outlets ?? [];

  if (outlets.length === 0) {
    return (
      <div className={`rounded-2xl border border-border/50 bg-white/80 dark:bg-card/80 backdrop-blur-sm shadow-sm p-5 ${className ?? ''}`}>
        <h3 className="text-sm font-semibold mb-4">Perbandingan Outlet</h3>
        <p className="text-xs text-muted-foreground text-center py-10">Belum ada data outlet</p>
      </div>
    );
  }

  // Summary rows for the table
  const summaryRows = [
    { label: 'Gross Sales', key: 'grossSales', format: 'currency' },
    { label: 'Net Sales', key: 'netSales', format: 'currency' },
    { label: 'Gross Profit', key: 'grossProfit', format: 'currency' },
    { label: 'Transaction', key: 'transactions', format: 'number' },
    { label: 'Avg Sale / Transaction', key: 'averageSale', format: 'currency' },
    { label: 'Gross Margin', key: 'grossMargin', format: 'percent' },
  ] as const;

  // Chart comparison metrics
  const chartMetrics = [
    { label: 'Gross Sales', key: 'grossSales' },
    { label: 'Net Sales', key: 'netSales' },
    { label: 'Gross Profit', key: 'grossProfit' },
    { label: 'Transaction', key: 'transactions' },
    { label: 'Avg Sale / Txn', key: 'averageSale' },
    { label: 'Gross Margin', key: 'grossMargin' },
  ] as const;

  // Build chart data: one bar per metric, grouped by outlet
  const comparisonChartData = chartMetrics.map((m) => {
    const entry: Record<string, string | number> = { metric: m.label };
    for (const o of outlets) {
      entry[o.outletName] = Number((o[m.key] as number).toFixed(2));
    }
    return entry;
  });

  // Gross sales bar chart (outlets as X-axis)
  const grossSalesChartData = outlets.map((o) => ({
    name: o.outletName,
    grossSales: o.grossSales,
  }));

  const formatValue = (val: number, fmt: string) => {
    if (fmt === 'currency') return formatCurrency(val);
    if (fmt === 'percent') return `${val.toFixed(1)}%`;
    return formatNumber(val);
  };

  return (
    <div className={`space-y-4 ${className ?? ''}`}>
      {/* TABLE SUMMARY — columns per outlet */}
      <div className="rounded-2xl border border-border/50 bg-white/80 dark:bg-card/80 backdrop-blur-sm shadow-sm p-5">
        <h3 className="text-sm font-semibold mb-4">Table Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="pb-3 pr-6 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-48" />
                {outlets.map((o, i) => (
                  <th key={o.outletId} className="pb-3 px-4 text-center min-w-[180px]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: OUTLET_COLORS[i % OUTLET_COLORS.length] }} />
                      <span className="text-sm font-semibold">{o.outletName}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Sales Summary */}
              <tr>
                <td colSpan={outlets.length + 1} className="pt-4 pb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Sales Summary
                </td>
              </tr>
              {summaryRows.map((row) => (
                <tr key={row.key} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 pr-6 text-xs text-muted-foreground">{row.label}</td>
                  {outlets.map((o) => (
                    <td key={o.outletId} className="py-2.5 px-4 text-center text-sm font-medium tabular-nums">
                      {formatValue(o[row.key] as number, row.format)}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Items — Top 3 */}
              <tr>
                <td colSpan={outlets.length + 1} className="pt-5 pb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Items
                </td>
              </tr>
              <tr className="border-b border-border/20">
                <td className="py-2.5 pr-6 text-xs text-muted-foreground">Top 3 Items</td>
                {outlets.map((o) => (
                  <td key={o.outletId} className="py-2.5 px-4">
                    {o.topItems && o.topItems.length > 0 ? (
                      <div className="space-y-1.5">
                        {o.topItems.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                            <span className="truncate">
                              <span className="text-muted-foreground">{idx + 1}.</span>{' '}
                              {item.name}
                            </span>
                            <span className="font-medium tabular-nums shrink-0">{formatCurrency(item.grossSales)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center">—</p>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* GRAPH COMPARISON — grouped bar chart */}
      <div className="rounded-2xl border border-border/50 bg-white/80 dark:bg-card/80 backdrop-blur-sm shadow-sm p-5">
        <h3 className="text-sm font-semibold mb-4">Graph Comparison</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={comparisonChartData} layout="vertical" barCategoryGap="18%">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              tickFormatter={(v: number) => {
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                return String(v);
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="metric"
              width={130}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
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
              formatter={(value: number) => [formatCurrency(value)]}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {outlets.map((o, i) => (
              <Bar
                key={o.outletId}
                dataKey={o.outletName}
                fill={OUTLET_COLORS[i % OUTLET_COLORS.length]}
                radius={[0, 3, 3, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* GROSS SALES AMOUNT — vertical bar chart */}
      <div className="rounded-2xl border border-border/50 bg-white/80 dark:bg-card/80 backdrop-blur-sm shadow-sm p-5">
        <h3 className="text-sm font-semibold mb-4">Gross Sales Amount</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={grossSalesChartData} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickFormatter={(v: number) => {
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                return String(v);
              }}
              width={55}
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
              formatter={(value: number) => [formatCurrency(value), 'Gross Sales']}
            />
            <Bar dataKey="grossSales" radius={[4, 4, 0, 0]}>
              {grossSalesChartData.map((_, i) => (
                <Cell key={i} fill={OUTLET_COLORS[i % OUTLET_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
