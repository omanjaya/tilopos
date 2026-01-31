import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Clock,
  UtensilsCrossed,
  RefreshCw,
  Loader2,
  Bell,
  Timer,
  Crown,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { kdsApi } from '@/api/endpoints/kds.api';
import { KDSStatsBar } from './components/kds-stats-bar';
import { CookingTimer } from './components/cooking-timer';
import type { KDSOrder, KDSOrderItem, KDSOrderPriority } from '@/types/kds.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

// --- Filter Tab Type ---

type FilterTab = 'all' | 'pending' | 'preparing' | 'ready';

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'preparing', label: 'Diproses' },
  { value: 'ready', label: 'Siap' },
];

// --- Utility Functions ---

function formatClock(date: Date): string {
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getElapsedColor(minutes: number): string {
  if (minutes >= 10) return 'border-red-500 bg-red-500/10';
  if (minutes >= 5) return 'border-yellow-500 bg-yellow-500/10';
  return 'border-zinc-700 bg-zinc-800';
}

function getElapsedBadgeVariant(minutes: number): string {
  if (minutes >= 10) return 'bg-red-600 text-white';
  if (minutes >= 5) return 'bg-yellow-600 text-white';
  return 'bg-zinc-700 text-zinc-300';
}

function getPriorityBorderClass(priority: KDSOrderPriority): string {
  if (priority === 'vip') return 'border-amber-400 ring-1 ring-amber-400/30';
  if (priority === 'urgent') return 'border-orange-500';
  return '';
}

function getPriorityValue(priority: KDSOrderPriority): number {
  if (priority === 'vip') return 0;
  if (priority === 'urgent') return 1;
  return 2;
}

function getOrderPrimaryStatus(order: KDSOrder): FilterTab {
  const items = order.items ?? [];
  if (items.length === 0) return 'pending';
  const allReady = items.every((i) => i.status === 'ready' || i.status === 'served');
  if (allReady) return 'ready';
  const allPending = items.every((i) => i.status === 'pending');
  if (allPending) return 'pending';
  return 'preparing';
}

// --- Audio Alert ---

let audioContextRef: AudioContext | null = null;
let lastAlertTime = 0;
const ALERT_COOLDOWN_MS = 30000;

function playAlertBeep() {
  const now = Date.now();
  if (now - lastAlertTime < ALERT_COOLDOWN_MS) return;
  lastAlertTime = now;

  try {
    if (!audioContextRef) {
      audioContextRef = new AudioContext();
    }
    const ctx = audioContextRef;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  } catch {
    // Web Audio API not available - silently fail
  }
}

let lastNewOrderBeepTime = 0;
const NEW_ORDER_BEEP_COOLDOWN_MS = 5000;

function playNewOrderBeep() {
  const now = Date.now();
  if (now - lastNewOrderBeepTime < NEW_ORDER_BEEP_COOLDOWN_MS) return;
  lastNewOrderBeepTime = now;

  try {
    if (!audioContextRef) {
      audioContextRef = new AudioContext();
    }
    const ctx = audioContextRef;

    // Two-tone ascending beep for new orders
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(660, ctx.currentTime);
    gain1.gain.setValueAtTime(0.25, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.2);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc2.start(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 0.5);
  } catch {
    // Web Audio API not available - silently fail
  }
}

// --- Priority Badge Component ---

function PriorityBadge({ priority }: { priority: KDSOrderPriority }) {
  if (priority === 'vip') {
    return (
      <Badge className="bg-amber-500 text-black font-bold gap-1">
        <Crown className="h-3 w-3" />
        VIP
      </Badge>
    );
  }
  if (priority === 'urgent') {
    return (
      <Badge className="bg-orange-500 text-white font-bold gap-1">
        <AlertTriangle className="h-3 w-3" />
        Urgent
      </Badge>
    );
  }
  return null;
}

// --- Order Item Row ---

function OrderItemRow({
  item,
  createdAt: _createdAt,
  onBump,
  isBumping,
}: {
  item: KDSOrderItem;
  createdAt: string;
  onBump: (id: string) => void;
  isBumping: boolean;
}) {
  const isDone = item.status === 'ready' || item.status === 'served';

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-2 rounded-md px-3 py-2',
        isDone ? 'bg-green-900/30 opacity-60' : 'bg-zinc-800/50',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('text-lg font-bold text-white', isDone && 'line-through')}>
            {item.quantity}x
          </span>
          <span className={cn('text-lg font-medium text-white', isDone && 'line-through')}>
            {item.productName}
          </span>
        </div>
        {item.modifiers.length > 0 && (
          <p className="mt-0.5 text-sm text-zinc-400">{item.modifiers.join(', ')}</p>
        )}
        {item.notes && <p className="mt-0.5 text-sm italic text-zinc-500">{item.notes}</p>}
      </div>
      {!isDone && (
        <Button
          size="sm"
          className="shrink-0 bg-green-600 text-white hover:bg-green-700 min-h-[44px] min-w-[44px]"
          onClick={() => onBump(item.id)}
          disabled={isBumping}
        >
          {isBumping ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}

// --- Order Card (with CookingTimer) ---

function OrderCard({
  order,
  onBumpItem,
  bumpingItemId,
  onNotifyCashier,
  isNotifying,
}: {
  order: KDSOrder;
  onBumpItem: (itemId: string) => void;
  bumpingItemId: string | null;
  onNotifyCashier: (orderId: string) => void;
  isNotifying: boolean;
}) {
  const items = order.items ?? [];
  const allDone = items.every(
    (item) => item.status === 'ready' || item.status === 'served',
  );

  const completedCount = items.filter(
    (i) => i.status === 'ready' || i.status === 'served',
  ).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const priority: KDSOrderPriority = order.priority ?? 'normal';
  const priorityBorderClass = getPriorityBorderClass(priority);

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border-2 transition-colors',
        allDone
          ? 'border-green-600 bg-green-900/20'
          : getElapsedColor(order.elapsedMinutes),
        !allDone && priorityBorderClass,
        priority === 'vip' && !allDone && 'shadow-lg shadow-amber-500/10',
      )}
    >
      {/* Progress Bar */}
      {!allDone && (
        <div className="h-1 w-full overflow-hidden rounded-t-xl bg-zinc-800">
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xl font-bold text-white">#{order.orderNumber}</span>
          {order.tableName && (
            <Badge className="bg-blue-600 text-white">{order.tableName}</Badge>
          )}
          <Badge variant="outline" className="border-zinc-600 text-zinc-400">
            {order.orderType}
          </Badge>
          <PriorityBadge priority={priority} />
        </div>
        <div className="flex items-center gap-1.5">
          {!allDone ? (
            <CookingTimer startTime={order.createdAt} targetMinutes={15} />
          ) : (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-zinc-400" />
              <span
                className={cn(
                  'text-sm font-mono font-bold',
                  getElapsedBadgeVariant(order.elapsedMinutes),
                  'rounded px-2 py-0.5',
                )}
              >
                {order.elapsedMinutes}m
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Info */}
      {!allDone && (
        <div className="px-4 py-1.5 text-xs text-zinc-500 border-b border-zinc-800/50">
          {completedCount}/{totalCount} item selesai
        </div>
      )}

      {/* Items */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {(order.items ?? []).map((item) => (
          <OrderItemRow
            key={item.id}
            item={item}
            createdAt={order.createdAt}
            onBump={onBumpItem}
            isBumping={bumpingItemId === item.id}
          />
        ))}
      </div>

      {/* Card Footer */}
      {allDone && (
        <div className="border-t border-green-700 px-4 py-3 space-y-2">
          <span className="block text-sm font-semibold text-green-400 text-center">
            Semua item selesai
          </span>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 min-h-[44px]"
            onClick={() => onNotifyCashier(order.id)}
            disabled={isNotifying}
          >
            {isNotifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            Beritahu Kasir
          </Button>
        </div>
      )}
    </div>
  );
}

// --- KDS Page ---

export function KDSPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const user = useAuthStore((s) => s.user);
  const outletId = selectedOutletId || user?.outletId || '';

  const [currentTime, setCurrentTime] = useState(new Date());
  const [bumpingItemId, setBumpingItemId] = useState<string | null>(null);
  const [notifyingOrderId, setNotifyingOrderId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  // Track which orders have already triggered alerts to avoid repeats
  const alertedOrdersRef = useRef<Set<string>>(new Set());
  // Track previous order IDs to detect new arrivals
  const previousOrderIdsRef = useRef<Set<string>>(new Set());

  // Clock - update every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch KDS orders with auto-refresh every 10 seconds
  const {
    data: orders = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['kds-orders', outletId],
    queryFn: () => kdsApi.getOrders(outletId),
    enabled: !!outletId,
    refetchInterval: 10000,
  });

  // Sound alert for new orders arriving
  useEffect(() => {
    if (orders.length === 0) return;

    const currentIds = new Set(orders.map((o) => o.id));
    const prevIds = previousOrderIdsRef.current;

    // Detect new orders not seen before
    if (prevIds.size > 0) {
      let hasNew = false;
      for (const id of currentIds) {
        if (!prevIds.has(id)) {
          hasNew = true;
          break;
        }
      }
      if (hasNew) {
        playNewOrderBeep();
        toast({
          title: 'Pesanan baru!',
          description: 'Pesanan baru telah masuk ke dapur.',
        });
      }
    }

    previousOrderIdsRef.current = currentIds;
  }, [orders]);

  // Sound alert for orders exceeding 10 minutes
  useEffect(() => {
    const hasOverdue = orders.some(
      (o) =>
        o.elapsedMinutes >= 10 &&
        !(o.items ?? []).every((i) => i.status === 'ready' || i.status === 'served') &&
        !alertedOrdersRef.current.has(o.id),
    );

    if (hasOverdue) {
      playAlertBeep();
      orders.forEach((o) => {
        if (
          o.elapsedMinutes >= 10 &&
          !(o.items ?? []).every((i) => i.status === 'ready' || i.status === 'served')
        ) {
          alertedOrdersRef.current.add(o.id);
        }
      });
    }
  }, [orders]);

  // Bump item mutation
  const bumpMutation = useMutation({
    mutationFn: kdsApi.bumpItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
      toast({ title: 'Item selesai' });
      setBumpingItemId(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal bump item',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
      setBumpingItemId(null);
    },
  });

  // Notify cashier mutation
  const notifyMutation = useMutation({
    mutationFn: (orderId: string) => kdsApi.notifyCashier(orderId, outletId),
    onSuccess: (_data, orderId) => {
      kdsApi.updateOrderStatus(orderId, 'ready').catch(() => {
        // non-critical
      });

      const order = orders.find((o) => o.id === orderId);
      const orderNum = order?.orderNumber ?? orderId;

      toast({
        title: `Order #${orderNum} siap disajikan`,
        description: 'Kasir telah diberitahu.',
      });
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
      setNotifyingOrderId(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal memberitahu kasir',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
      setNotifyingOrderId(null);
    },
  });

  function handleBumpItem(itemId: string) {
    setBumpingItemId(itemId);
    bumpMutation.mutate(itemId);
  }

  const handleNotifyCashier = useCallback(
    (orderId: string) => {
      setNotifyingOrderId(orderId);
      notifyMutation.mutate(orderId);
    },
    [notifyMutation],
  );

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
      filteredOrders.filter(
        (o) => !(o.items ?? []).every((i) => i.status === 'ready' || i.status === 'served'),
      ),
    [filteredOrders],
  );

  const completedOrders = useMemo(
    () =>
      filteredOrders.filter((o) =>
        (o.items ?? []).length > 0 && (o.items ?? []).every((i) => i.status === 'ready' || i.status === 'served'),
      ),
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

  return (
    <div className="flex h-screen flex-col bg-zinc-900 text-white">
      {/* Top Bar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-700 bg-zinc-950 px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-white hover:bg-zinc-800 min-h-[44px] min-w-[44px]"
            onClick={() => navigate('/app')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="h-6 w-6 text-orange-400" />
            <div>
              <h1 className="text-lg font-bold">Kitchen Display</h1>
              <p className="text-xs text-zinc-400">{user?.outletName || 'Outlet'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Badge className="bg-orange-600 text-white text-sm px-3 py-1">
            {filterCounts.pending + filterCounts.preparing} pesanan aktif
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-white hover:bg-zinc-800 min-h-[44px] min-w-[44px]"
            onClick={() => refetch()}
          >
            {isFetching ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}
          </Button>
          <div className="font-mono text-2xl font-bold text-zinc-300">
            {formatClock(currentTime)}
          </div>
        </div>
      </header>

      {/* Kitchen Performance Stats (using KDSStatsBar component) */}
      {orders.length > 0 && (
        <KDSStatsBar
          orders={statsOrders}
          targetMinutes={15}
          onRefresh={() => refetch()}
          isRefreshing={isFetching}
        />
      )}

      {/* Filter Tabs */}
      {orders.length > 0 && (
        <div className="border-b border-zinc-800 bg-zinc-950/30 px-4 py-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-500" />
            <div className="flex gap-1">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveFilter(tab.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    activeFilter === tab.value
                      ? 'bg-orange-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200',
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      'ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                      activeFilter === tab.value
                        ? 'bg-orange-800 text-orange-200'
                        : 'bg-zinc-700 text-zinc-400',
                    )}
                  >
                    {filterCounts[tab.value]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4">
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-orange-400" />
              <p className="mt-4 text-lg text-zinc-400">Memuat pesanan...</p>
            </div>
          </div>
        )}

        {isError && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-lg text-red-400">Gagal memuat pesanan</p>
              <Button
                variant="outline"
                className="mt-4 border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                onClick={() => refetch()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Coba Lagi
              </Button>
            </div>
          </div>
        )}

        {!isLoading && !isError && orders.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <UtensilsCrossed className="mx-auto h-16 w-16 text-zinc-600" />
              <p className="mt-4 text-xl font-medium text-zinc-400">Tidak ada pesanan</p>
              <p className="mt-1 text-sm text-zinc-500">
                Pesanan baru akan muncul secara otomatis
              </p>
            </div>
          </div>
        )}

        {!isLoading && !isError && orders.length > 0 && (
          <div className="space-y-6">
            {/* Filtered has no results */}
            {filteredOrders.length === 0 && (
              <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                  <Timer className="mx-auto h-12 w-12 text-zinc-600" />
                  <p className="mt-3 text-lg font-medium text-zinc-400">
                    Tidak ada pesanan untuk filter ini
                  </p>
                  <Button
                    variant="ghost"
                    className="mt-2 text-orange-400 hover:text-orange-300"
                    onClick={() => setActiveFilter('all')}
                  >
                    Tampilkan semua
                  </Button>
                </div>
              </div>
            )}

            {/* Active Orders */}
            {activeOrders.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {activeOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onBumpItem={handleBumpItem}
                    bumpingItemId={bumpingItemId}
                    onNotifyCashier={handleNotifyCashier}
                    isNotifying={notifyingOrderId === order.id}
                  />
                ))}
              </div>
            )}

            {/* Completed Orders */}
            {completedOrders.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">
                  Selesai ({completedOrders.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {completedOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onBumpItem={handleBumpItem}
                      bumpingItemId={bumpingItemId}
                      onNotifyCashier={handleNotifyCashier}
                      isNotifying={notifyingOrderId === order.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
