import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KDSStatsOrder {
  id: string;
  createdAt: string;
  elapsedMinutes: number;
  items: Array<{
    status: 'pending' | 'preparing' | 'ready' | 'served';
  }>;
  completedAt?: string;
  prepTimeMinutes?: number;
}

export interface KDSStatsBarProps {
  orders: KDSStatsOrder[];
  targetMinutes?: number;
  autoRefreshInterval?: number; // ms, default 30000
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

interface StatsData {
  ordersInQueue: number;
  averagePrepTime: number;
  completedToday: number;
  overdueOrders: number;
}

function computeStats(orders: KDSStatsOrder[], targetMinutes: number): StatsData {
  const activeOrders = orders.filter(
    (o) => !(o.items ?? []).every((i) => i.status === 'ready' || i.status === 'served'),
  );

  const completedOrders = orders.filter((o) => {
    const items = o.items ?? [];
    return items.length > 0 && items.every((i) => i.status === 'ready' || i.status === 'served');
  });

  const overdueOrders = activeOrders.filter(
    (o) => o.elapsedMinutes > targetMinutes,
  );

  const avgPrepTime =
    completedOrders.length > 0
      ? completedOrders.reduce(
          (sum, o) => sum + (o.prepTimeMinutes ?? o.elapsedMinutes),
          0,
        ) / completedOrders.length
      : 0;

  return {
    ordersInQueue: activeOrders.length,
    averagePrepTime: isNaN(avgPrepTime) ? 0 : Math.round(avgPrepTime * 10) / 10,
    completedToday: completedOrders.length,
    overdueOrders: overdueOrders.length,
  };
}

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
  alertColor,
}: {
  icon: typeof Clock;
  label: string;
  value: string | number;
  unit?: string;
  color: string;
  alertColor?: string;
}) {
  const displayColor = alertColor ?? color;

  return (
    <div className="flex items-center gap-3 rounded-lg bg-zinc-800/60 px-4 py-3">
      <div className={cn('rounded-lg bg-zinc-700/50 p-2', displayColor)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </p>
        <div className="flex items-baseline gap-1">
          <span className={cn('text-2xl font-bold tabular-nums', displayColor)}>
            {value}
          </span>
          {unit && (
            <span className="text-xs text-zinc-500">{unit}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function KDSStatsBar({
  orders,
  targetMinutes = 15,
  autoRefreshInterval = 30000,
  onRefresh,
  isRefreshing = false,
}: KDSStatsBarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const stats = useMemo(
    () => computeStats(orders, targetMinutes),
    [orders, targetMinutes],
  );

  const handleRefresh = useCallback(() => {
    setLastRefreshed(new Date());
    onRefresh?.();
  }, [onRefresh]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, autoRefreshInterval);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, handleRefresh]);

  return (
    <div className="border-b border-zinc-700 bg-zinc-950/50">
      {/* Header toggle */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <BarChart3 className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wider">
            Statistik Dapur
          </span>
          {collapsed ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-600">
            Update: {lastRefreshed.toLocaleTimeString('id-ID')}
          </span>
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
            >
              {isRefreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Stats grid */}
      {!collapsed && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4 pb-4">
          <StatCard
            icon={Clock}
            label="Antrian Pesanan"
            value={stats.ordersInQueue}
            color="text-blue-400"
          />
          <StatCard
            icon={BarChart3}
            label="Rata-rata Persiapan"
            value={stats.averagePrepTime}
            unit="menit"
            color="text-purple-400"
          />
          <StatCard
            icon={CheckCircle2}
            label="Selesai Hari Ini"
            value={stats.completedToday}
            color="text-green-400"
          />
          <StatCard
            icon={AlertCircle}
            label="Pesanan Terlambat"
            value={stats.overdueOrders}
            color="text-zinc-400"
            alertColor={stats.overdueOrders > 0 ? 'text-red-400' : undefined}
          />
        </div>
      )}
    </div>
  );
}
