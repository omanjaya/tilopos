import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { useKdsOrders } from './hooks/useKdsOrders';
import { useKdsSound } from './hooks/useKdsSound';
import { useKdsTimer } from './hooks/useKdsTimer';
import { useKdsFilters } from './hooks/useKdsFilters';
import { KDSStatsBar } from './components/kds-stats-bar';
import { KdsHeader } from './components/kds-header';
import { KdsFilters } from './components/kds-filters';
import { OrderGrid } from './components/order-grid';
import { KdsEmptyState } from './components/kds-empty-state';

export function KDSPage() {
  const navigate = useNavigate();
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const user = useAuthStore((s) => s.user);
  const outletId = selectedOutletId || user?.outletId || '';

  // Fetch orders and mutations
  const {
    orders,
    isLoading,
    isError,
    isFetching,
    refetch,
    bumpItem,
    notifyCashier,
    bumpingItemId,
    notifyingOrderId,
  } = useKdsOrders(outletId);

  // Sound effects
  useKdsSound(orders);

  // Clock timer
  const currentTime = useKdsTimer();

  // Filtering and sorting
  const { activeFilter, setActiveFilter, activeOrders, completedOrders, filterCounts, filteredOrders } =
    useKdsFilters(orders);

  // Handle bump item
  const handleBumpItem = useCallback(bumpItem, [bumpItem]);

  // Handle notify cashier
  const handleNotifyCashier = useCallback(notifyCashier, [notifyCashier]);

  // Build stats orders for the KDSStatsBar
  const statsOrders = useMemo(
    () =>
      orders.map((o) => ({
        id: o.id,
        createdAt: o.createdAt,
        elapsedMinutes: o.elapsedMinutes,
        items: (o.items ?? []).map((i) => ({ status: i.status })),
      })),
    [orders],
  );

  // Calculate active order count
  const activeOrderCount = filterCounts.pending + filterCounts.preparing;

  return (
    <div className="flex h-screen flex-col bg-zinc-900 text-white">
      {/* Top Bar */}
      <KdsHeader
        currentTime={currentTime}
        activeOrderCount={activeOrderCount}
        outletName={user?.outletName || 'Outlet'}
        onBack={() => navigate('/app')}
        onRefresh={refetch}
        isRefreshing={isFetching}
      />

      {/* Kitchen Performance Stats */}
      {orders.length > 0 && (
        <KDSStatsBar
          orders={statsOrders}
          targetMinutes={15}
          onRefresh={refetch}
          isRefreshing={isFetching}
        />
      )}

      {/* Filter Tabs */}
      {orders.length > 0 && (
        <KdsFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          filterCounts={filterCounts}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4">
        {isLoading && <KdsEmptyState type="loading" />}

        {isError && <KdsEmptyState type="error" onRetry={refetch} />}

        {!isLoading && !isError && orders.length === 0 && <KdsEmptyState type="no-orders" />}

        {!isLoading && !isError && orders.length > 0 && (
          <div className="space-y-6">
            {/* Filtered has no results */}
            {filteredOrders.length === 0 && (
              <KdsEmptyState type="no-filtered-orders" onShowAll={() => setActiveFilter('all')} />
            )}

            {/* Active Orders */}
            {activeOrders.length > 0 && (
              <OrderGrid
                orders={activeOrders}
                onBumpItem={handleBumpItem}
                bumpingItemId={bumpingItemId}
                onNotifyCashier={handleNotifyCashier}
                notifyingOrderId={notifyingOrderId}
              />
            )}

            {/* Completed Orders */}
            {completedOrders.length > 0 && (
              <OrderGrid
                orders={completedOrders}
                onBumpItem={handleBumpItem}
                bumpingItemId={bumpingItemId}
                onNotifyCashier={handleNotifyCashier}
                notifyingOrderId={notifyingOrderId}
                title="Selesai"
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
