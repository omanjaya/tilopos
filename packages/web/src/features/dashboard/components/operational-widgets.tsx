import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/api/endpoints/reports.api';
import {
  LayoutGrid, ChefHat, Clock, Users,
  Package, AlertTriangle, TrendingUp, TrendingDown,
  CalendarClock, Star, CheckCircle2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DateRange } from '@/types/report.types';

// ── Shared mini stat ──
function MiniStat({
  icon: Icon,
  label,
  value,
  iconBg,
  iconColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 dark:bg-muted/10">
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconBg)}>
        <Icon className={cn('h-4 w-4', iconColor)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}

// ── F&B Widget ──
interface OperationalWidgetProps {
  outletId: string;
  dateRange: DateRange;
  className?: string;
}

export function FnBWidget({ outletId, dateRange, className }: OperationalWidgetProps) {
  const { data: kitchen, isLoading: kitchenLoading } = useQuery({
    queryKey: ['reports', 'kitchen', outletId, dateRange],
    queryFn: () => reportsApi.kitchen({ outletId, dateRange }),
    enabled: !!outletId,
  });

  const { data: table, isLoading: tableLoading } = useQuery({
    queryKey: ['reports', 'table', outletId, dateRange],
    queryFn: () => reportsApi.table({ outletId, dateRange }),
    enabled: !!outletId,
  });

  const isLoading = kitchenLoading || tableLoading;

  return (
    <div
      className={cn(
        'rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm',
        'border border-border/50 dark:border-white/[0.06]',
        'shadow-sm p-6',
        className,
      )}
    >
      <h3 className="font-semibold mb-4">Operasional F&B</h3>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <MiniStat
            icon={LayoutGrid}
            label="Okupansi Meja"
            value={`${(table?.avgOccupancy ?? 0).toFixed(0)}%`}
            iconBg="bg-orange-100 dark:bg-orange-900/40"
            iconColor="text-orange-600 dark:text-orange-400"
          />
          <MiniStat
            icon={ChefHat}
            label="Pesanan Dapur"
            value={String(kitchen?.totalOrders ?? 0)}
            iconBg="bg-amber-100 dark:bg-amber-900/40"
            iconColor="text-amber-600 dark:text-amber-400"
          />
          <MiniStat
            icon={Clock}
            label="Rata-rata Masak"
            value={`${kitchen?.avgPrepTime ?? 0} mnt`}
            iconBg="bg-blue-100 dark:bg-blue-900/40"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <MiniStat
            icon={Users}
            label="Total Tamu"
            value={String(table?.totalGuests ?? 0)}
            iconBg="bg-violet-100 dark:bg-violet-900/40"
            iconColor="text-violet-600 dark:text-violet-400"
          />
        </div>
      )}
    </div>
  );
}

// ── Retail Widget ──
export function RetailWidget({ outletId, dateRange, className }: OperationalWidgetProps) {
  const { data: inventory, isLoading } = useQuery({
    queryKey: ['reports', 'inventory', outletId, dateRange],
    queryFn: () => reportsApi.inventory({ outletId, dateRange }),
    enabled: !!outletId,
  });

  return (
    <div
      className={cn(
        'rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm',
        'border border-border/50 dark:border-white/[0.06]',
        'shadow-sm p-6',
        className,
      )}
    >
      <h3 className="font-semibold mb-4">Inventori</h3>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <MiniStat
            icon={AlertTriangle}
            label="Stok Rendah"
            value={String(inventory?.lowStockCount ?? 0)}
            iconBg="bg-rose-100 dark:bg-rose-900/40"
            iconColor="text-rose-600 dark:text-rose-400"
          />
          <MiniStat
            icon={Package}
            label="Stok Habis"
            value={String(inventory?.outOfStockCount ?? 0)}
            iconBg="bg-red-100 dark:bg-red-900/40"
            iconColor="text-red-600 dark:text-red-400"
          />
          <MiniStat
            icon={TrendingUp}
            label="Nilai Stok"
            value={formatCurrency(inventory?.totalStockValue ?? 0)}
            iconBg="bg-emerald-100 dark:bg-emerald-900/40"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
          <MiniStat
            icon={TrendingDown}
            label="Pergerakan"
            value={String(inventory?.stockMovements ?? 0)}
            iconBg="bg-blue-100 dark:bg-blue-900/40"
            iconColor="text-blue-600 dark:text-blue-400"
          />
        </div>
      )}
    </div>
  );
}

// ── Service Widget ──
export function ServiceWidget({ outletId, dateRange, className }: OperationalWidgetProps) {
  const { data: appointment, isLoading: appointmentLoading } = useQuery({
    queryKey: ['reports', 'appointment', outletId, dateRange],
    queryFn: () => reportsApi.appointment({ outletId, dateRange }),
    enabled: !!outletId,
  });

  const { data: staff, isLoading: staffLoading } = useQuery({
    queryKey: ['reports', 'staff', outletId, dateRange],
    queryFn: () => reportsApi.staff({ outletId, dateRange }),
    enabled: !!outletId,
  });

  const isLoading = appointmentLoading || staffLoading;

  return (
    <div
      className={cn(
        'rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm',
        'border border-border/50 dark:border-white/[0.06]',
        'shadow-sm p-6',
        className,
      )}
    >
      <h3 className="font-semibold mb-4">Layanan</h3>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <MiniStat
            icon={CalendarClock}
            label="Booking"
            value={String(appointment?.totalBookings ?? 0)}
            iconBg="bg-violet-100 dark:bg-violet-900/40"
            iconColor="text-violet-600 dark:text-violet-400"
          />
          <MiniStat
            icon={CheckCircle2}
            label="Selesai"
            value={String(appointment?.completedBookings ?? 0)}
            iconBg="bg-emerald-100 dark:bg-emerald-900/40"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
          <MiniStat
            icon={Star}
            label="Rating"
            value={`${(staff?.avgRating ?? 0).toFixed(1)}/5`}
            iconBg="bg-amber-100 dark:bg-amber-900/40"
            iconColor="text-amber-600 dark:text-amber-400"
          />
          <MiniStat
            icon={TrendingUp}
            label="Pendapatan"
            value={formatCurrency(appointment?.totalRevenue ?? 0)}
            iconBg="bg-blue-100 dark:bg-blue-900/40"
            iconColor="text-blue-600 dark:text-blue-400"
          />
        </div>
      )}
    </div>
  );
}
