import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ownerAnalyticsApi } from '@/api/endpoints/owner-analytics.api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useSocket } from '@/hooks/realtime/use-socket';
import { formatCurrency, formatNumber } from '@/lib/format';
import { FinancialCommandSection } from './components/financial-command-section';
import { StaffPerformanceSection } from './components/staff-performance-section';
import type { DateRange } from '@/types/report.types';
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Users,
  Store,
  Activity,
  AlertTriangle,
  Clock,
  RefreshCw,
  ChevronRight,
  Wallet,
} from 'lucide-react';

export function OwnerDashboardPage() {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [isLive, setIsLive] = useState(true);
  const [mainTab, setMainTab] = useState<'dashboard' | 'financial' | 'staff'>('dashboard');

  // WebSocket connection
  const { socket, isConnected } = useSocket();

  // Real-time metrics (updates every 30s when live mode enabled)
  const { data: realTimeMetrics, isLoading: realTimeLoading } = useQuery({
    queryKey: ['owner-analytics', 'real-time'],
    queryFn: ownerAnalyticsApi.getRealTimeMetrics,
    refetchInterval: isLive ? 30000 : false, // 30 seconds
    enabled: isLive,
  });

  // Overview metrics
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['owner-analytics', 'overview', dateRange],
    queryFn: () => ownerAnalyticsApi.getOverview({ dateRange }),
    enabled: !isLive, // Only when not in live mode
  });

  // Outlets comparison
  const { data: outletsComparison, isLoading: outletsLoading } = useQuery({
    queryKey: ['owner-analytics', 'outlets-comparison', dateRange],
    queryFn: () => ownerAnalyticsApi.getOutletsComparison({ dateRange }),
  });

  // Critical alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['owner-analytics', 'critical-alerts'],
    queryFn: ownerAnalyticsApi.getCriticalAlerts,
    refetchInterval: 60000, // Refresh every minute
  });

  // WebSocket events - refresh on transaction events
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleTransactionCompleted = () => {
      if (isLive) {
        queryClient.invalidateQueries({ queryKey: ['owner-analytics', 'real-time'] });
      }
      queryClient.invalidateQueries({ queryKey: ['owner-analytics', 'overview'] });
      queryClient.invalidateQueries({ queryKey: ['owner-analytics', 'outlets-comparison'] });
    };

    const handleTransferStatusChanged = () => {
      queryClient.invalidateQueries({ queryKey: ['owner-analytics', 'critical-alerts'] });
    };

    socket.current?.on('transaction:completed', handleTransactionCompleted);
    socket.current?.on('transfer:status_changed', handleTransferStatusChanged);

    return () => {
      socket.current?.off('transaction:completed', handleTransactionCompleted);
      socket.current?.off('transfer:status_changed', handleTransferStatusChanged);
    };
  }, [socket, isConnected, isLive, queryClient]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const displayData = (isLive ? realTimeMetrics : overview) as Record<string, any> | undefined;
  const isLoading = isLive ? realTimeLoading : overviewLoading;

  const criticalAlertsCount = alertsData?.alerts.filter((a) => a.severity === 'critical').length || 0;
  const warningAlertsCount = alertsData?.alerts.filter((a) => a.severity === 'warning').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Owner Dashboard"
        description="Monitoring performa bisnis secara real-time"
      >
        {isConnected && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse" />
            Live
          </Badge>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['owner-analytics'] });
            queryClient.invalidateQueries({ queryKey: ['financial-command'] });
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </PageHeader>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as typeof mainTab)}>
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="dashboard" className="gap-2">
            <Activity className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2">
            <Wallet className="h-4 w-4" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2">
            <Users className="h-4 w-4" />
            Staff
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6 mt-6">

      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <Tabs
          value={isLive ? 'live' : dateRange}
          onValueChange={(v) => {
            if (v === 'live') {
              setIsLive(true);
            } else {
              setIsLive(false);
              setDateRange(v as DateRange);
            }
          }}
        >
          <TabsList className="bg-white/80 dark:bg-card/80 shadow-sm backdrop-blur-sm">
            <TabsTrigger value="live" className="gap-2">
              <Activity className="h-3.5 w-3.5" />
              Live
            </TabsTrigger>
            <TabsTrigger value="today">Hari Ini</TabsTrigger>
            <TabsTrigger value="this_week">Minggu Ini</TabsTrigger>
            <TabsTrigger value="this_month">Bulan Ini</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLive && realTimeMetrics && (
          <p className="text-xs text-muted-foreground">
            Last update: {new Date(realTimeMetrics.timestamp).toLocaleTimeString('id-ID')}
          </p>
        )}
      </div>

      {/* Critical Alerts Banner */}
      {!alertsLoading && alertsData && alertsData.alerts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <CardTitle className="text-base text-yellow-900">
                  {criticalAlertsCount > 0
                    ? `🚨 ${criticalAlertsCount} Alert Kritis`
                    : `⚠️ ${warningAlertsCount} Peringatan`}
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm" className="text-yellow-900 hover:bg-yellow-100">
                Lihat Semua <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alertsData.alerts.slice(0, 3).map((alert, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 bg-white rounded-lg p-3 text-sm"
                >
                  {alert.severity === 'critical' ? (
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                  ) : (
                    <Clock className="h-4 w-4 text-yellow-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{alert.title}</p>
                    <p className="text-gray-600 mt-0.5">{alert.description}</p>
                    {alert.outletName && (
                      <p className="text-xs text-gray-500 mt-1">Outlet: {alert.outletName}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(isLive ? 4 : 6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Sales */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {isLive ? 'Penjualan Hari Ini' : 'Total Penjualan'}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                {formatCurrency(displayData?.totalSales || displayData?.todaySales || 0)}
              </div>
              {isLive && realTimeMetrics && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last hour: {formatCurrency(realTimeMetrics.lastHourSales)}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Profit (only for non-live mode) */}
          {!isLive && overview && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Profit
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(overview.totalProfit)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Margin:{' '}
                  {overview.totalSales > 0
                    ? ((overview.totalProfit / overview.totalSales) * 100).toFixed(1)
                    : 0}
                  %
                </p>
              </CardContent>
            </Card>
          )}

          {/* Transactions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {isLive ? 'Transaksi Hari Ini' : 'Total Transaksi'}
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {formatNumber(displayData?.totalTransactions || displayData?.todayTransactions || 0)}
              </div>
              {isLive && realTimeMetrics && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last hour: {formatNumber(realTimeMetrics.lastHourTransactions)}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Customers (only for non-live mode) */}
          {!isLive && overview && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Pelanggan
                </CardTitle>
                <Users className="h-4 w-4 text-violet-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-violet-600">
                  {formatNumber(overview.totalCustomers)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Pelanggan unik</p>
              </CardContent>
            </Card>
          )}

          {/* Average Order Value */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rata-rata Transaksi
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">
                {formatCurrency(displayData?.averageOrderValue || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Per transaksi</p>
            </CardContent>
          </Card>

          {/* Active Orders (live mode) */}
          {isLive && realTimeMetrics && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Order Aktif
                </CardTitle>
                <Activity className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {formatNumber(realTimeMetrics.activeOrders)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Sedang diproses</p>
              </CardContent>
            </Card>
          )}

          {/* Outlets Count */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Outlet
              </CardTitle>
              <Store className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-600">
                {formatNumber(displayData?.outletsCount || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Cabang aktif</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Multi-Outlet Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="h-4 w-4" />
            Perbandingan Performa Outlet
          </CardTitle>
          <CardDescription>
            {isLive ? 'Data hari ini' : `Data periode ${dateRange}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {outletsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : outletsComparison && outletsComparison.outlets.length > 0 ? (
            <div className="space-y-4">
              {outletsComparison.outlets.map((outlet, index) => {
                const maxSales = outletsComparison.outlets[0]?.sales || 1;
                const salesPercent = (outlet.sales / maxSales) * 100;

                return (
                  <div key={outlet.outletId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{outlet.outletName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(outlet.transactions)} transaksi •{' '}
                            {formatCurrency(outlet.avgOrderValue)} avg
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(outlet.sales)}</p>
                        {index === 0 && (
                          <Badge variant="default" className="text-xs">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Top Performer
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          index === 0
                            ? 'bg-emerald-500'
                            : index === 1
                            ? 'bg-blue-500'
                            : 'bg-gray-400'
                        }`}
                        style={{ width: `${salesPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Store className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Belum ada data outlet untuk periode ini</p>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6 mt-6">
          <FinancialCommandSection dateRange={isLive ? 'today' : dateRange} />
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff" className="space-y-6 mt-6">
          <StaffPerformanceSection dateRange={isLive ? 'today' : dateRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
