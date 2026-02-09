import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/api/endpoints/reports.api';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { MobileNavSpacer } from '@/components/shared/mobile-nav';
import { formatCurrency } from '@/lib/format';
import { FeatureGate, FEATURES } from '@/components/shared/feature-gate';
import { useBusinessFeatures } from '@/hooks/use-business-features';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
  ChevronDown,
  BarChart3,
  PieChart,
  LayoutGrid,
  ChefHat,
  CalendarClock,
  Package,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DateRange } from '@/types/report.types';
import { cn } from '@/lib/utils';

/**
 * DashboardPage Mobile Version
 *
 * Mobile-optimized dashboard with:
 * - Swipeable metric cards (carousel)
 * - Collapsible chart sections
 * - Vertical scroll layout
 * - Simplified charts
 */

export function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>('this_month');
  const [salesChartOpen, setSalesChartOpen] = useState(true);
  const [financialOpen, setFinancialOpen] = useState(false);
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const user = useAuthStore((s) => s.user);
  const outletId = selectedOutletId ?? user?.outletId ?? '';

  const { data: salesReport, isLoading: salesLoading } = useQuery({
    queryKey: ['reports', 'sales', outletId, dateRange],
    queryFn: () => reportsApi.sales({ outletId, dateRange }),
    enabled: !!outletId,
  });

  const { data: financialReport, isLoading: financialLoading } = useQuery({
    queryKey: ['reports', 'financial', outletId, dateRange],
    queryFn: () => reportsApi.financial({ outletId, dateRange }),
    enabled: !!outletId,
  });

  const { data: customerReport, isLoading: customerLoading } = useQuery({
    queryKey: ['reports', 'customers', outletId, dateRange],
    queryFn: () => reportsApi.customers({ outletId, dateRange }),
    enabled: !!outletId,
  });

  const isLoading = salesLoading || financialLoading || customerLoading;

  // Business type checks for dynamic dashboard
  const { isFnB, isService, isRetail } = useBusinessFeatures();

  const metrics = [
    {
      title: 'Total Penjualan',
      value: formatCurrency(salesReport?.totalSales ?? 0),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Transaksi',
      value: String(salesReport?.totalTransactions ?? 0),
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Rata-rata Order',
      value: formatCurrency(salesReport?.averageOrderValue ?? 0),
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Pelanggan',
      value: String(customerReport?.totalCustomers ?? 0),
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Ringkasan performa bisnis
              </p>
            </div>
          </div>

          {/* Date Range Tabs */}
          <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)} className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-auto">
              <TabsTrigger value="today" className="text-xs py-2">
                Hari Ini
              </TabsTrigger>
              <TabsTrigger value="this_week" className="text-xs py-2">
                Minggu Ini
              </TabsTrigger>
              <TabsTrigger value="this_month" className="text-xs py-2">
                Bulan Ini
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Metric Cards - Horizontal Scroll */}
        <div className="px-4 py-4">
          {isLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="min-w-[280px] snap-start animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-20 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
              {metrics.map((metric, i) => (
                <MetricCardMobile key={i} {...metric} />
              ))}
            </div>
          )}
          <div className="flex justify-center gap-1 mt-3">
            {metrics.map((_, i) => (
              <div key={i} className="h-1.5 w-1.5 rounded-full bg-muted" />
            ))}
          </div>

          {/* F&B Specific Metrics */}
          <FeatureGate feature={[FEATURES.TABLE_MANAGEMENT, FEATURES.KITCHEN_DISPLAY]}>
            {isFnB && !isLoading && (
              <div className="flex gap-3 overflow-x-auto pt-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
                <FeatureGate feature={FEATURES.TABLE_MANAGEMENT}>
                  <MetricCardMobile
                    title="Meja Terisi"
                    value="8/12"
                    icon={LayoutGrid}
                    color="text-orange-600"
                    bgColor="bg-orange-50"
                  />
                </FeatureGate>
                <FeatureGate feature={FEATURES.KITCHEN_DISPLAY}>
                  <MetricCardMobile
                    title="Pesanan Dimasak"
                    value="5"
                    icon={ChefHat}
                    color="text-amber-600"
                    bgColor="bg-amber-50"
                  />
                </FeatureGate>
              </div>
            )}
          </FeatureGate>

          {/* Service Specific Metrics */}
          <FeatureGate feature={FEATURES.APPOINTMENTS}>
            {isService && !isLoading && (
              <div className="flex gap-3 overflow-x-auto pt-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
                <MetricCardMobile
                  title="Jadwal Hari Ini"
                  value="8"
                  icon={CalendarClock}
                  color="text-purple-600"
                  bgColor="bg-purple-50"
                />
                <MetricCardMobile
                  title="Selesai"
                  value="5"
                  icon={TrendingUp}
                  color="text-green-600"
                  bgColor="bg-green-50"
                />
              </div>
            )}
          </FeatureGate>

          {/* Retail Specific Metrics */}
          <FeatureGate feature={FEATURES.STOCK_MANAGEMENT}>
            {isRetail && !isLoading && (
              <div className="flex gap-3 overflow-x-auto pt-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
                <MetricCardMobile
                  title="Stok Rendah"
                  value="12"
                  icon={Package}
                  color="text-red-600"
                  bgColor="bg-red-50"
                />
              </div>
            )}
          </FeatureGate>
        </div>

        {/* Sales Chart - Collapsible */}
        <div className="px-4 pb-4">
          <Collapsible open={salesChartOpen} onOpenChange={setSalesChartOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-primary/10 p-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-base">Grafik Penjualan</CardTitle>
                    </div>
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 text-muted-foreground transition-transform',
                        salesChartOpen && 'rotate-180'
                      )}
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  {salesLoading ? (
                    <Skeleton className="h-[200px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={salesReport?.salesByDate ?? []}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis
                          dataKey="date"
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        />
                        <YAxis
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          tickFormatter={(v: number) => {
                            if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                            if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                            return String(v);
                          }}
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
                        <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Financial Metrics - Collapsible */}
        {financialReport && (
          <div className="px-4 pb-4">
            <Collapsible open={financialOpen} onOpenChange={setFinancialOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="rounded-full bg-green-600/10 p-2">
                          <PieChart className="h-4 w-4 text-green-600" />
                        </div>
                        <CardTitle className="text-base">Keuangan</CardTitle>
                      </div>
                      <ChevronDown
                        className={cn(
                          'h-5 w-5 text-muted-foreground transition-transform',
                          financialOpen && 'rotate-180'
                        )}
                      />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-green-600/10 p-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Pendapatan</p>
                          <p className="font-semibold">{formatCurrency(financialReport.totalRevenue)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-blue-600/10 p-2">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Laba Kotor</p>
                          <p className="font-semibold">{formatCurrency(financialReport.grossProfit)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-purple-600/10 p-2">
                          <TrendingUp className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Margin</p>
                          <p className="font-semibold">{(financialReport.grossMargin ?? 0).toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        )}

        {/* Spacer for bottom nav */}
        <div className="h-4" />
      </div>

      {/* Mobile Nav Spacer */}
      <MobileNavSpacer />
    </div>
  );
}

/**
 * MetricCardMobile Component
 * Individual swipeable metric card
 */
interface MetricCardMobileProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

function MetricCardMobile({ title, value, icon: Icon, color, bgColor }: MetricCardMobileProps) {
  return (
    <Card className="min-w-[280px] snap-start">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={cn('rounded-full p-3', bgColor)}>
            <Icon className={cn('h-6 w-6', color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
