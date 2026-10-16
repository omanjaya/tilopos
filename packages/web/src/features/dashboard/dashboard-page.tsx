import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMokaDashboard } from './hooks/use-moka-dashboard';
import type { DashboardTab } from './hooks/use-moka-dashboard';
import {
  DashboardSkeleton,
  DashboardDatePicker,
  SalesSummaryGrid,
  DayOfWeekChart,
  HourlyChart,
  ItemSummarySection,
  OutletComparisonSection,
} from './components';
import { GettingStartedChecklist } from './components/getting-started-checklist';
import { DashboardNoAccess } from './components/dashboard-no-access';
import { ErrorState } from '@/components/shared/error-state';

export function DashboardPage() {
  const dashboard = useMokaDashboard();

  if (!dashboard.hasAccess) {
    return <DashboardNoAccess />;
  }

  if (dashboard.isLoading && dashboard.activeTab === 'dashboard' && !dashboard.summary) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Getting Started Checklist (new users) */}
      <GettingStartedChecklist />

      {/* Date Picker + Tab Bar — compact row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={dashboard.activeTab} onValueChange={(v) => dashboard.setActiveTab(v as DashboardTab)}>
          <TabsList className="bg-white/80 dark:bg-card/80 shadow-sm backdrop-blur-sm">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="outlet_comparison">Perbandingan Outlet</TabsTrigger>
          </TabsList>
        </Tabs>
        <DashboardDatePicker dateRange={dashboard.dateRange} onChange={dashboard.setDateRange} />
      </div>

      {/* TAB: Dashboard */}
      {dashboard.activeTab === 'dashboard' && (
        <div className="space-y-5">
          {dashboard.summaryError ? (
            <ErrorState
              title="Gagal memuat ringkasan penjualan"
              error={dashboard.summaryError}
              onRetry={() => void dashboard.refetchSummary()}
            />
          ) : (
            <>
              <SalesSummaryGrid data={dashboard.summary} isLoading={dashboard.summaryLoading} />

              <div className="grid gap-5 lg:grid-cols-2">
                <DayOfWeekChart
                  data={dashboard.summary?.salesByDayOfWeek}
                  isLoading={dashboard.summaryLoading}
                />
                <HourlyChart
                  data={dashboard.summary?.salesByHour}
                  isLoading={dashboard.summaryLoading}
                />
              </div>
            </>
          )}

          {dashboard.itemsError ? (
            <ErrorState
              title="Gagal memuat ringkasan item"
              error={dashboard.itemsError}
              onRetry={() => void dashboard.refetchItems()}
            />
          ) : (
            <ItemSummarySection data={dashboard.items} isLoading={dashboard.itemsLoading} />
          )}
        </div>
      )}

      {/* TAB: Outlet Comparison */}
      {dashboard.activeTab === 'outlet_comparison' && (
        dashboard.outletComparisonError ? (
          <ErrorState
            title="Gagal memuat perbandingan outlet"
            error={dashboard.outletComparisonError}
            onRetry={() => void dashboard.refetchOutletComparison()}
          />
        ) : (
          <OutletComparisonSection
            data={dashboard.outletComparison}
            isLoading={dashboard.outletComparisonLoading}
          />
        )
      )}
    </div>
  );
}
