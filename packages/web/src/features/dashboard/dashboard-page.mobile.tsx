import { useState } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { startOfDay, startOfWeek, startOfMonth, endOfDay } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MobileNavSpacer } from '@/components/shared/mobile-nav';
import { formatCurrency, formatNumber } from '@/lib/format';
import {
  DollarSign, Receipt, TrendingUp, ShoppingCart,
  Calculator, Percent, ChevronDown, BarChart3,
  CalendarIcon, Trophy, Store,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useMokaDashboard } from './hooks/use-moka-dashboard';
import type { DashboardTab, DateRangeValue } from './hooks/use-moka-dashboard';

// ── Quick Date Presets ──
function MobileDateSelector({ dateRange, onChange }: { dateRange: DateRangeValue; onChange: (v: DateRangeValue) => void }) {
  const presets = [
    { label: 'Hari Ini', getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
    { label: 'Minggu Ini', getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: new Date() }) },
    { label: 'Bulan Ini', getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  ];

  const label = `${format(dateRange.from, 'd MMM', { locale: localeId })} - ${format(dateRange.to, 'd MMM', { locale: localeId })}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarIcon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div className="flex gap-2">
        {presets.map((p) => (
          <Button key={p.label} variant="outline" size="sm" className="text-xs flex-1" onClick={() => onChange(p.getValue())}>
            {p.label}
          </Button>
        ))}
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
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ── KPI Card ──
function KpiCard({ label, value, icon: Icon, color, bg }: {
  label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-white/80 dark:bg-card/80 shadow-sm p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={cn('rounded-lg p-1.5', bg)}>
          <Icon className={cn('h-3.5 w-3.5', color)} />
        </div>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-bold tracking-tight">{value}</p>
    </div>
  );
}

// ── Mobile Dashboard ──
export function DashboardPage() {
  const dashboard = useMokaDashboard();

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">Dashboard</h1>
              <p className="text-xs text-muted-foreground">Ringkasan performa bisnis</p>
            </div>
          </div>
          <MobileDateSelector dateRange={dashboard.dateRange} onChange={dashboard.setDateRange} />
          <Tabs value={dashboard.activeTab} onValueChange={(v) => dashboard.setActiveTab(v as DashboardTab)} className="w-full">
            <TabsList className="w-full grid grid-cols-2 h-auto">
              <TabsTrigger value="dashboard" className="text-xs py-2">Dashboard</TabsTrigger>
              <TabsTrigger value="outlet_comparison" className="text-xs py-2">Outlet</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-4">

          {/* TAB: Dashboard */}
          {dashboard.activeTab === 'dashboard' && (
            <>
              {/* 2-column KPI Grid */}
              {dashboard.summaryLoading ? (
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border bg-white/80 dark:bg-card/80 p-3">
                      <Skeleton className="h-12" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <KpiCard label="Penjualan Kotor" value={formatCurrency(dashboard.summary?.grossSales ?? 0)} icon={DollarSign} color="text-emerald-600" bg="bg-emerald-100 dark:bg-emerald-900/40" />
                  <KpiCard label="Penjualan Bersih" value={formatCurrency(dashboard.summary?.netSales ?? 0)} icon={Receipt} color="text-blue-600" bg="bg-blue-100 dark:bg-blue-900/40" />
                  <KpiCard label="Laba Kotor" value={formatCurrency(dashboard.summary?.grossProfit ?? 0)} icon={TrendingUp} color="text-violet-600" bg="bg-violet-100 dark:bg-violet-900/40" />
                  <KpiCard label="Transaksi" value={formatNumber(dashboard.summary?.transactions ?? 0)} icon={ShoppingCart} color="text-amber-600" bg="bg-amber-100 dark:bg-amber-900/40" />
                  <KpiCard label="Rata-rata / Txn" value={formatCurrency(dashboard.summary?.averageSalePerTransaction ?? 0)} icon={Calculator} color="text-cyan-600" bg="bg-cyan-100 dark:bg-cyan-900/40" />
                  <KpiCard label="Margin Kotor" value={`${(dashboard.summary?.grossMargin ?? 0).toFixed(1)}%`} icon={Percent} color="text-rose-600" bg="bg-rose-100 dark:bg-rose-900/40" />
                </div>
              )}

              {/* Day of Week Chart */}
              <Section title="Penjualan per Hari" icon={BarChart3} iconColor="text-primary" iconBg="bg-primary/10" defaultOpen>
                {dashboard.summaryLoading ? (
                  <Skeleton className="h-[180px] w-full rounded-xl" />
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={dashboard.summary?.salesByDayOfWeek ?? []} barCategoryGap="15%">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
                      <XAxis dataKey="dayName" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={(v: string) => v.slice(0, 3)} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={(v: number) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v/1_000).toFixed(0)}K` : String(v)} width={40} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} formatter={(value: number) => [formatCurrency(value), 'Penjualan']} />
                      <Bar dataKey="grossSales" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Section>

              {/* Hourly Chart */}
              <Section title="Penjualan per Jam" icon={BarChart3} iconColor="text-blue-600" iconBg="bg-blue-100 dark:bg-blue-900/40">
                {dashboard.summaryLoading ? (
                  <Skeleton className="h-[180px] w-full rounded-xl" />
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={dashboard.summary?.salesByHour ?? []} barCategoryGap="5%">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
                      <XAxis dataKey="hour" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} tickFormatter={(v: number) => `${String(v).padStart(2, '0')}`} axisLine={false} tickLine={false} interval={3} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={(v: number) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v/1_000).toFixed(0)}K` : String(v)} width={40} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} formatter={(value: number) => [formatCurrency(value), 'Penjualan']} labelFormatter={(l: number) => `${String(l).padStart(2, '0')}:00`} />
                      <Bar dataKey="grossSales" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Section>

              {/* Top Items */}
              <Section title="Produk Terlaris" icon={Trophy} iconColor="text-amber-600" iconBg="bg-amber-100 dark:bg-amber-900/40">
                {dashboard.items?.topItems && dashboard.items.topItems.length > 0 ? (
                  <div className="space-y-2">
                    {dashboard.items.topItems.slice(0, 10).map((item, i) => (
                      <div key={item.productId} className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground">{item.quantitySold} terjual</p>
                        </div>
                        <span className="text-xs font-semibold tabular-nums">{formatCurrency(item.grossSales)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Belum ada data</p>
                )}
              </Section>
            </>
          )}

          {/* TAB: Outlet Comparison */}
          {dashboard.activeTab === 'outlet_comparison' && (
            <>
              {dashboard.outletComparisonLoading ? (
                <div className="rounded-2xl border bg-white/80 dark:bg-card/80 p-4">
                  <Skeleton className="h-[200px] rounded-xl" />
                </div>
              ) : dashboard.outletComparison?.outlets && dashboard.outletComparison.outlets.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.outletComparison.outlets.map((outlet) => (
                    <div key={outlet.outletId} className="rounded-2xl bg-white/80 dark:bg-card/80 border border-border/50 shadow-sm p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-sm">{outlet.outletName}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-muted/30 rounded-lg">
                          <span className="text-muted-foreground">Penjualan</span>
                          <p className="font-semibold">{formatCurrency(outlet.grossSales)}</p>
                        </div>
                        <div className="p-2 bg-muted/30 rounded-lg">
                          <span className="text-muted-foreground">Transaksi</span>
                          <p className="font-semibold">{formatNumber(outlet.transactions)}</p>
                        </div>
                        <div className="p-2 bg-muted/30 rounded-lg">
                          <span className="text-muted-foreground">Laba Kotor</span>
                          <p className="font-semibold">{formatCurrency(outlet.grossProfit)}</p>
                        </div>
                        <div className="p-2 bg-muted/30 rounded-lg">
                          <span className="text-muted-foreground">Margin</span>
                          <p className="font-semibold">{outlet.grossMargin.toFixed(1)}%</p>
                        </div>
                      </div>
                      {outlet.topItems && outlet.topItems.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/30">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Top Items</p>
                          {outlet.topItems.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                              <span className="truncate"><span className="text-muted-foreground">{idx + 1}.</span> {item.name}</span>
                              <span className="font-medium tabular-nums shrink-0 ml-2">{formatCurrency(item.grossSales)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Totals */}
                  {dashboard.outletComparison.totals && (
                    <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4">
                      <p className="font-semibold text-sm mb-2">Total Semua Outlet</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Penjualan</span>
                          <p className="font-semibold">{formatCurrency(dashboard.outletComparison.totals.grossSales)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Net Sales</span>
                          <p className="font-semibold">{formatCurrency(dashboard.outletComparison.totals.netSales)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Transaksi</span>
                          <p className="font-semibold">{formatNumber(dashboard.outletComparison.totals.transactions)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl bg-white/80 dark:bg-card/80 border border-border/50 shadow-sm p-4">
                  <p className="text-xs text-muted-foreground text-center py-4">Belum ada data outlet</p>
                </div>
              )}
            </>
          )}

          <div className="h-4" />
        </div>
      </div>

      <MobileNavSpacer />
    </div>
  );
}
