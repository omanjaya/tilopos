import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api/endpoints/settings.api';
import { useRealtimeNotifications } from '@/hooks/use-realtime';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Bell,
  Package,
  DollarSign,
  ChefHat,
  Clock,
  AlertTriangle,
  Check,
  CheckCheck,
  RotateCcw,
  Globe,
  Cake,
  CreditCard,
} from 'lucide-react';
import { toast } from '@/lib/toast-utils';
import type { NotificationLog } from '@/types/settings.types';

/** Mirrors Prisma NotificationType (+ realtime-only order_ready / system_alert). */
type NotificationType =
  | 'low_stock'
  | 'large_transaction'
  | 'refund'
  | 'online_order'
  | 'shift_reminder'
  | 'system_error'
  | 'birthday'
  | 'subscription_trial_expiring'
  | 'subscription_expired'
  | 'subscription_payment_success'
  | 'subscription_payment_failed'
  | 'order_ready'
  | 'system_alert';

const NOTIFICATION_META: Record<NotificationType, { icon: React.ElementType; color: string; title: string }> = {
  low_stock: { icon: Package, color: 'text-yellow-500', title: 'Stok Rendah' },
  large_transaction: { icon: DollarSign, color: 'text-green-500', title: 'Transaksi Besar' },
  refund: { icon: RotateCcw, color: 'text-orange-500', title: 'Refund' },
  online_order: { icon: Globe, color: 'text-blue-500', title: 'Pesanan Online' },
  shift_reminder: { icon: Clock, color: 'text-purple-500', title: 'Pengingat Shift' },
  system_error: { icon: AlertTriangle, color: 'text-red-500', title: 'Kesalahan Sistem' },
  birthday: { icon: Cake, color: 'text-pink-500', title: 'Ulang Tahun Pelanggan' },
  subscription_trial_expiring: { icon: CreditCard, color: 'text-amber-500', title: 'Masa Trial Segera Berakhir' },
  subscription_expired: { icon: CreditCard, color: 'text-red-500', title: 'Langganan Berakhir' },
  subscription_payment_success: { icon: CreditCard, color: 'text-green-500', title: 'Pembayaran Langganan Berhasil' },
  subscription_payment_failed: { icon: CreditCard, color: 'text-red-500', title: 'Pembayaran Langganan Gagal' },
  order_ready: { icon: ChefHat, color: 'text-blue-500', title: 'Pesanan Siap' },
  system_alert: { icon: AlertTriangle, color: 'text-red-500', title: 'Peringatan Sistem' },
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();

  if (diff < 60_000) return 'Baru saja';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m lalu`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}j lalu`;
  return `${Math.floor(diff / 86_400_000)}h lalu`;
}

function getNotificationType(type: string): NotificationType {
  if (type in NOTIFICATION_META) return type as NotificationType;
  return 'system_alert';
}

function getTitleForType(type: string): string {
  return type in NOTIFICATION_META ? NOTIFICATION_META[type as NotificationType].title : 'Notifikasi';
}

interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [isOpen, setIsOpen] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [realtimeNotifs, setRealtimeNotifs] = useState<RealtimeNotification[]>([]);

  const employeeId = user?.employeeId || '';

  const { data: serverLogs, isError: logsError, refetch: refetchLogs } = useQuery({
    queryKey: ['notification-logs', employeeId],
    queryFn: () => settingsApi.getNotificationLogs({ limit: 20 }),
    enabled: !!employeeId,
    refetchInterval: 60_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => settingsApi.markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
    },
    onError: (_error, id) => {
      // Revert the optimistic "read" flag
      setRealtimeNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
      toast.error({ title: 'Gagal menandai notifikasi sebagai dibaca' });
    },
  });

  // Merge server logs with realtime notifications
  const allNotifications: RealtimeNotification[] = (() => {
    const serverItems: RealtimeNotification[] = (serverLogs ?? []).map((log: NotificationLog) => ({
      id: log.id,
      type: log.type,
      title: log.title || getTitleForType(log.type),
      message: log.message,
      isRead: log.isRead,
      createdAt: log.createdAt,
    }));

    // Merge, preferring realtime versions and deduplicating by id
    const seen = new Set<string>();
    const merged: RealtimeNotification[] = [];

    for (const n of realtimeNotifs) {
      if (!seen.has(n.id)) {
        seen.add(n.id);
        merged.push(n);
      }
    }
    for (const n of serverItems) {
      if (!seen.has(n.id)) {
        seen.add(n.id);
        merged.push(n);
      }
    }

    return merged
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);
  })();

  const unreadCount = allNotifications.filter((n) => !n.isRead).length;

  // Real-time notifications
  const onNotification = useCallback(
    (event: RealtimeNotification) => {
      setRealtimeNotifs((prev) => {
        const exists = prev.some((n) => n.id === event.id);
        if (exists) return prev;
        return [event, ...prev].slice(0, 20);
      });
      // Trigger bell animation
      setAnimate(true);
    },
    [],
  );

  useRealtimeNotifications({ onNotification });

  // Clear animation after 1s
  useEffect(() => {
    if (!animate) return;
    const timer = setTimeout(() => setAnimate(false), 1000);
    return () => clearTimeout(timer);
  }, [animate]);

  const handleNotificationClick = (notification: RealtimeNotification) => {
    if (!notification.isRead) {
      // Update locally first
      setRealtimeNotifs((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
      );
      markReadMutation.mutate(notification.id);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = allNotifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setRealtimeNotifs((prev) => prev.map((n) => (unreadIds.includes(n.id) ? { ...n, isRead: true } : n)));
    try {
      await settingsApi.markAllNotificationsRead();
    } catch {
      setRealtimeNotifs((prev) => prev.map((n) => (unreadIds.includes(n.id) ? { ...n, isRead: false } : n)));
      toast.error({ title: 'Gagal menandai semua notifikasi sebagai dibaca' });
    }
    void queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:scale-105"
          aria-label={`Notifikasi${unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ''}`}
        >
          <Bell
            className={cn(
              'h-4 w-4',
              animate && 'animate-bounce',
            )}
          />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifikasi</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground"
              onClick={() => void handleMarkAllRead()}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Tandai semua dibaca
            </Button>
          )}
        </div>

        {/* Notification list */}
        <ScrollArea className="h-80">
          {logsError && (
            <div className="flex items-center justify-between gap-2 border-b bg-destructive/5 px-4 py-2 text-xs text-destructive" role="alert">
              <span>Gagal memuat notifikasi.</span>
              <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={() => void refetchLogs()}>
                Coba lagi
              </Button>
            </div>
          )}
          {allNotifications.length === 0 ? (
            logsError ? null : <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
              <Bell className="mb-2 h-8 w-8 opacity-30" />
              <p>Belum ada notifikasi</p>
            </div>
          ) : (
            <div className="divide-y">
              {allNotifications.map((notification) => {
                const nType = getNotificationType(notification.type);
                const { icon: Icon, color: iconColor } = NOTIFICATION_META[nType];

                return (
                  <button
                    key={notification.id}
                    type="button"
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent',
                      !notification.isRead && 'bg-accent/50',
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted', iconColor)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={cn('text-sm', !notification.isRead && 'font-semibold')}>
                          {notification.title}
                        </p>
                        {notification.isRead && (
                          <Check className="h-3 w-3 shrink-0 text-muted-foreground" />
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {allNotifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2 text-center">
              <span className="text-xs text-muted-foreground">
                Menampilkan {allNotifications.length} notifikasi terbaru
              </span>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
