import { useState, useMemo } from 'react';
import type { KDSOrder, KDSOrderPriority } from '@/types/kds.types';

export type FilterTab = 'all' | 'pending' | 'preparing' | 'ready';

export const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'preparing', label: 'Diproses' },
  { value: 'ready', label: 'Siap' },
];

function getOrderPrimaryStatus(order: KDSOrder): FilterTab {
  const items = order.items ?? [];
  if (items.length === 0) return 'pending';
  const allReady = items.every((i) => i.status === 'ready' || i.status === 'served');
  if (allReady) return 'ready';
  const allPending = items.every((i) => i.status === 'pending');
  if (allPending) return 'pending';
  return 'preparing';
}

function getPriorityValue(priority: KDSOrderPriority): number {
  if (priority === 'vip') return 0;
  if (priority === 'urgent') return 1;
  return 2;
}

export function useKdsFilters(orders: KDSOrder[]) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  // Sort orders: VIP first, then Urgent, then Normal; within each, oldest first
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const aPriority = getPriorityValue(a.priority ?? 'normal');
      const bPriority = getPriorityValue(b.priority ?? 'normal');
      if (aPriority !== bPriority) return aPriority - bPriority;
      return b.elapsedMinutes - a.elapsedMinutes;
    });
  }, [orders]);

  // Apply filter
  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') return sortedOrders;
    return sortedOrders.filter((o) => getOrderPrimaryStatus(o) === activeFilter);
  }, [sortedOrders, activeFilter]);

  const activeOrders = useMemo(
    () =>
      filteredOrders.filter((o) => {
        const items = o.items ?? [];
        return items.length > 0 && !items.every((i) => i.status === 'ready' || i.status === 'served');
      }),
    [filteredOrders],
  );

  const completedOrders = useMemo(
    () =>
      filteredOrders.filter((o) => {
        const items = o.items ?? [];
        return items.length > 0 && items.every((i) => i.status === 'ready' || i.status === 'served');
      }),
    [filteredOrders],
  );

  // Counts for filter badges (always from all orders, not filtered)
  const filterCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = { all: 0, pending: 0, preparing: 0, ready: 0 };
    counts.all = sortedOrders.length;
    for (const order of sortedOrders) {
      const status = getOrderPrimaryStatus(order);
      counts[status]++;
    }
    return counts;
  }, [sortedOrders]);

  return {
    activeFilter,
    setActiveFilter,
    filteredOrders,
    activeOrders,
    completedOrders,
    filterCounts,
  };
}
