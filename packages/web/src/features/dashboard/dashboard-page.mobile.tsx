import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { MobileNavSpacer } from '@/components/shared/mobile-nav';
import { FeatureGate, FEATURES } from '@/components/shared/feature-gate';
import { useBusinessFeatures } from '@/hooks/use-business-features';
import { formatCurrency, formatNumber } from '@/lib/format';
import { calculatePercentageChange, formatPercentageChange } from '@/lib/date-utils';
import {
  DollarSign, ShoppingCart, TrendingUp, Users,
  ChevronDown, BarChart3, PieChart, Trophy, Wallet,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart as RPieChart,
  Pie, Cell,
} from 'recharts';
import type { DateRange } from '@/types/report.types';
import { cn } from '@/lib/utils';
import { useDashboardData } from './hooks/use-dashboard-data';

const DONUT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4', '#f97316'];
const METHOD_LABELS: Record<string, string> = {
  cash: 'Tunai', qris: 'QRIS', debit_card: 'Debit', credit_card: 'Kredit',
  gopay: 'GoPay', ovo: 'OVO', dana: 'DANA', shopeepay: 'ShopeePay',
  linkaja: 'LinkAja', bank_transfer: 'Transfer',
};

// ── Mobile Metric Card ──
function MobileMetricCard({
  title, value, icon: Icon, color, bgColor,
  current, previous,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  current?: number;
  previous?: number;
}) {
  const hasTrend = current !== undefined && previous !== undefined;
  const change = hasTrend ? calculatePercentageChange(current, previous) : 0;
  const isUp = change > 0.01;
  const isDown = change < -0.01;

  return (
    <div className="min-w-[260px] snap-start rounded-2xl bg-white/80 dark:bg-card/80 border border-border/50 dark:border-white/[0.06] shadow-sm p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {hasTrend && (
            <div className="mt-1.5 flex items-center gap-1">
              <div
                className={cn(
                  'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                  isUp && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
                  isDown && 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
                  !isUp && !isDown && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                )}
              >
                {isUp && <ArrowUpRight className="h-2.5 w-2.5" />}
                {isDown && <ArrowDownRight className="h-2.5 w-2.5" />}
                {formatPercentageChange(change)}
              </div>
            </div>
          )}
        </div>
        <div className={cn('rounded-xl p-3', bgColor)}>
          <Icon className={cn('h-5 w-5', color)} />
        </div>
      </div>
    </div>
  );
}

// ── Collapsible Section ──
function Section({
  title, icon: Icon, iconColor, iconBg,
  defaultOpen = false, children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-2xl bg-white/80 dark:bg-card/80 border border-border/50 dark:border-white/[0.06] shadow-sm overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <div className={cn('rounded-lg p-2', iconBg)}>
                <Icon className={cn('h-4 w-4', iconColor)} />
              </div>
              <span className="font-semibold text-sm">{title}</span>
            </div>
            <ChevronDown
              className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ── Mobile Dashboard ──
export function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>('this_month');
  const { isFnB, isService, isRetail } = useBusinessFeatures();
  const data = useDashboardData(dateRange);

  const metrics = [
    {
      title: 'Total Penjualan',
      value: formatCurrency(data.sales?.totalSales ?? 0),
      icon: DollarSign,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/40',
      current: data.sales?.totalSales,
      previous: data.previousSales?.totalSales,
    },
    {
      title: 'Transaksi',
      value: formatNumber(data.sales?.totalTransactions ?? 0),
      icon: ShoppingCart,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/40',
      current: data.sales?.totalTransactions,
      previous: data.previousSales?.totalTransactions,
    },
    {
      title: 'Rata-rata Order',
      value: formatCurrency(data.sales?.averageOrderValue ?? 0),
      icon: TrendingUp,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/40',
      current: data.sales?.averageOrderValue,
      previous: data.previousSales?.averageOrderValue,
    },
    {
      title: 'Pelanggan',
      value: formatNumber(data.customers?.totalCustomers ?? 0),
      icon: Users,
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-100 dark:bg-violet-900/40',
      current: undefined,
      previous: undefined,
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold">Dashboard</h1>
              <p className="text-xs text-muted-foreground">Ringkasan performa bisnis</p>
            </div>
          </div>
          <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)} className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-auto">
              <TabsTrigger value="today" className="text-xs py-2">Hari Ini</TabsTrigger>
              <TabsTrigger value="this_week" className="text-xs py-2">Minggu Ini</TabsTrigger>
              <TabsTrigger value="this_month" className="text-xs py-2">Bulan Ini</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-4">
          {/* KPI Carousel */}
          {data.isLoading ? (
            <div className="flex gap-3 overflow-x-auto -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="min-w-[260px] snap-start rounded-2xl border bg-white/80 dark:bg-card/80 p-4">
                  <Skeleton className="h-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
              {metrics.map((m, i) => (
                <MobileMetricCard key={i} {...m} />
              ))}
            </div>
          )}

          {/* Sales Chart */}
          <Section
            title="Grafik Penjualan"
            icon={BarChart3}
            iconColor="text-primary"
            iconBg="bg-primary/10"
            defaultOpen
          >
            {data.salesLoading ? (
              <Skeleton className="h-[200px] w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.sales?.salesByDate ?? []}>
                  <defs>
                    <linearGradient id="mSalesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickFormatter={(v: number) => {
                      if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                      if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                      return String(v);
                    }}
                    width={45}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Penjualan']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#mSalesGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Section>

          {/* Financial */}
          <Section
            title="Keuangan"
            icon={Wallet}
            iconColor="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-emerald-100 dark:bg-emerald-900/40"
          >
            {data.financial ? (
              <div className="space-y-2">
                {[
                  { label: 'Pendapatan', value: formatCurrency(data.financial.totalRevenue), color: 'text-emerald-600' },
                  { label: 'Laba Kotor', value: formatCurrency(data.financial.grossProfit), color: 'text-blue-600' },
                  { label: 'Margin', value: `${data.financial.grossMargin.toFixed(1)}%`, color: 'text-amber-600' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className={cn('text-sm font-semibold', item.color)}>{item.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <Skeleton className="h-32 rounded-xl" />
            )}
          </Section>

          {/* Payment Methods */}
          <Section
            title="Metode Pembayaran"
            icon={PieChart}
            iconColor="text-blue-600 dark:text-blue-400"
            iconBg="bg-blue-100 dark:bg-blue-900/40"
          >
            {data.paymentMethods && data.paymentMethods.methods.length > 0 ? (
              <>
                <div className="relative mx-auto h-[150px] w-[150px] mb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <RPieChart>
                      <Pie
                        data={data.paymentMethods.methods.slice(0, 7)}
                        dataKey="amount"
                        nameKey="method"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={3}
                        cornerRadius={3}
                        stroke="none"
                      >
                        {data.paymentMethods.methods.slice(0, 7).map((_, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                    </RPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5">
                  {data.paymentMethods.methods.slice(0, 5).map((m, i) => (
                    <div key={m.method} className="flex items-center gap-2 text-xs">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      <span className="flex-1">{METHOD_LABELS[m.method] ?? m.method}</span>
                      <span className="font-medium tabular-nums">{m.percentage.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Belum ada data</p>
            )}
          </Section>

          {/* Top Products */}
          <Section
            title="Produk Terlaris"
            icon={Trophy}
            iconColor="text-amber-600 dark:text-amber-400"
            iconBg="bg-amber-100 dark:bg-amber-900/40"
          >
            {data.products?.topProducts && data.products.topProducts.length > 0 ? (
              <div className="space-y-2.5">
                {data.products.topProducts.slice(0, 5).map((p, i) => (
                  <div key={p.productId} className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.quantitySold} terjual</p>
                    </div>
                    <span className="text-xs font-semibold tabular-nums">{formatCurrency(p.revenue)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Belum ada data</p>
            )}
          </Section>

          {/* Business-type widgets */}
          <FeatureGate feature={[FEATURES.TABLE_MANAGEMENT, FEATURES.KITCHEN_DISPLAY]}>
            {isFnB && (
              <div className="rounded-2xl bg-white/80 dark:bg-card/80 border border-border/50 dark:border-white/[0.06] shadow-sm p-4">
                <p className="font-semibold text-sm mb-3">Operasional F&B</p>
                <p className="text-xs text-muted-foreground">Lihat detail di halaman Laporan</p>
              </div>
            )}
          </FeatureGate>

          <FeatureGate feature={FEATURES.STOCK_MANAGEMENT}>
            {isRetail && (
              <div className="rounded-2xl bg-white/80 dark:bg-card/80 border border-border/50 dark:border-white/[0.06] shadow-sm p-4">
                <p className="font-semibold text-sm mb-3">Inventori</p>
                <p className="text-xs text-muted-foreground">Lihat detail di halaman Laporan</p>
              </div>
            )}
          </FeatureGate>

          <FeatureGate feature={FEATURES.APPOINTMENTS}>
            {isService && (
              <div className="rounded-2xl bg-white/80 dark:bg-card/80 border border-border/50 dark:border-white/[0.06] shadow-sm p-4">
                <p className="font-semibold text-sm mb-3">Layanan</p>
                <p className="text-xs text-muted-foreground">Lihat detail di halaman Laporan</p>
              </div>
            )}
          </FeatureGate>

          <div className="h-4" />
        </div>
      </div>

      <MobileNavSpacer />
    </div>
  );
}
