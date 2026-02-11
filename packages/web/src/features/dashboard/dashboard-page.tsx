import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeatureGate, FEATURES } from '@/components/shared/feature-gate';
import { useBusinessFeatures } from '@/hooks/use-business-features';
import { formatCurrency, formatNumber } from '@/lib/format';
import { DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import type { DateRange } from '@/types/report.types';
import { useDashboardData } from './hooks/use-dashboard-data';
import {
  StatCard,
  DashboardSkeleton,
  SalesTrendChart,
  FinancialSummary,
  CustomerInsights,
  PaymentChart,
  TopProducts,
  QuickActions,
  FnBWidget,
  RetailWidget,
  ServiceWidget,
} from './components';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat Pagi';
  if (hour < 15) return 'Selamat Siang';
  if (hour < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

export function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>('this_month');
  const { isFnB, isService, isRetail } = useBusinessFeatures();
  const data = useDashboardData(dateRange);

  if (data.isLoading) {
    return <DashboardSkeleton />;
  }

  const sparkSales = data.sales?.salesByDate?.slice(-7).map((d) => d.sales) ?? [];
  const sparkTxn = data.sales?.salesByDate?.slice(-7).map((d) => d.transactions) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{getGreeting()},</p>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{data.userName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Berikut ringkasan performa bisnis Anda
          </p>
        </div>
        <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <TabsList className="bg-white/80 dark:bg-card/80 shadow-sm backdrop-blur-sm">
            <TabsTrigger value="today">Hari Ini</TabsTrigger>
            <TabsTrigger value="this_week">Minggu Ini</TabsTrigger>
            <TabsTrigger value="this_month">Bulan Ini</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Penjualan"
          value={formatCurrency(data.sales?.totalSales ?? 0)}
          icon={DollarSign}
          color="emerald"
          current={data.sales?.totalSales}
          previous={data.previousSales?.totalSales}
          sparklineData={sparkSales}
        />
        <StatCard
          title="Transaksi"
          value={formatNumber(data.sales?.totalTransactions ?? 0)}
          icon={ShoppingCart}
          color="blue"
          current={data.sales?.totalTransactions}
          previous={data.previousSales?.totalTransactions}
          sparklineData={sparkTxn}
        />
        <StatCard
          title="Rata-rata Order"
          value={formatCurrency(data.sales?.averageOrderValue ?? 0)}
          icon={TrendingUp}
          color="amber"
          current={data.sales?.averageOrderValue}
          previous={data.previousSales?.averageOrderValue}
        />
        <StatCard
          title="Pelanggan"
          value={formatNumber(data.customers?.totalCustomers ?? 0)}
          icon={Users}
          color="violet"
          current={data.customers?.totalCustomers}
          previous={undefined}
        />
      </div>

      {/* Bento Grid */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Sales Chart — spans 2 cols, 2 rows */}
        <SalesTrendChart
          data={data.sales?.salesByDate ?? []}
          isLoading={data.salesLoading}
          className="lg:col-span-2 lg:row-span-2"
        />

        {/* Financial Summary */}
        <FinancialSummary
          financial={data.financial}
          previousFinancial={data.previousFinancial}
          isLoading={data.financialLoading}
        />

        {/* Customer Insights */}
        <CustomerInsights
          customers={data.customers}
          isLoading={data.customersLoading}
        />

        {/* Payment Methods */}
        <PaymentChart
          data={data.paymentMethods?.methods ?? []}
          totalAmount={data.paymentMethods?.totalAmount ?? 0}
          isLoading={data.paymentMethodsLoading}
        />

        {/* Top Products */}
        <TopProducts
          products={data.products?.topProducts ?? []}
          isLoading={data.productsLoading}
          className="lg:col-span-2"
        />
      </div>

      {/* Business-type Widgets + Quick Actions */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Operational widget */}
        <FeatureGate feature={[FEATURES.TABLE_MANAGEMENT, FEATURES.KITCHEN_DISPLAY]}>
          {isFnB && (
            <FnBWidget
              outletId={data.outletId}
              dateRange={dateRange}
              className="lg:col-span-2"
            />
          )}
        </FeatureGate>

        <FeatureGate feature={FEATURES.STOCK_MANAGEMENT}>
          {isRetail && (
            <RetailWidget
              outletId={data.outletId}
              dateRange={dateRange}
              className="lg:col-span-2"
            />
          )}
        </FeatureGate>

        <FeatureGate feature={FEATURES.APPOINTMENTS}>
          {isService && (
            <ServiceWidget
              outletId={data.outletId}
              dateRange={dateRange}
              className="lg:col-span-2"
            />
          )}
        </FeatureGate>

        {/* Quick Actions */}
        <QuickActions isFnB={isFnB} isService={isService} />
      </div>
    </div>
  );
}
