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
} from 'lucide-react';
import type { NotificationLog } from '@/types/settings.types';

type NotificationType = 'low_stock' | 'large_transaction' | 'order_ready' | 'shift_reminder' | 'system_alert';

const NOTIFICATION_ICONS: Record<NotificationType, React.ElementType> = {
  low_stock: Package,
  large_transaction: DollarSign,
  order_ready: ChefHat,
  shift_reminder: Clock,
  system_alert: AlertTriangle,
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  low_stock: 'text-yellow-500',
  large_transaction: 'text-green-500',
  order_ready: 'text-blue-500',
  shift_reminder: 'text-purple-500',
  system_alert: 'text-red-500',
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
  if (type in NOTIFICATION_ICONS) return type as NotificationType;
  return 'system_alert';
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

  const { data: serverLogs } = useQuery({
    queryKey: ['notification-logs', employeeId],
    queryFn: () => settingsApi.getNotificationLogs(employeeId),
    enabled: !!employeeId,
    refetchInterval: 60_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => settingsApi.markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
    },
  });

  // Merge server logs with realtime notifications
  const allNotifications: RealtimeNotification[] = (() => {
    const serverItems: RealtimeNotification[] = (serverLogs ?? []).map((log: NotificationLog) => ({
      id: log.id,
      type: log.type,
      title: getTitleForType(log.type),
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

  const handleMarkAllRead = () => {
    setRealtimeNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    for (const n of allNotifications) {
      if (!n.isRead) {
        markReadMutation.mutate(n.id);
      }
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center justify-center rounded-md p-2 transition-colors hover:bg-accent"
          aria-label={`Notifikasi${unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ''}`}
        >
          <Bell
            className={cn(
              'h-5 w-5',
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
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Tandai semua dibaca
            </Button>
          )}
        </div>

        {/* Notification list */}
        <ScrollArea className="h-80">
          {allNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
              <Bell className="mb-2 h-8 w-8 opacity-30" />
              <p>Belum ada notifikasi</p>
            </div>
          ) : (
            <div className="divide-y">
              {allNotifications.map((notification) => {
                const nType = getNotificationType(notification.type);
                const Icon = NOTIFICATION_ICONS[nType];
                const iconColor = NOTIFICATION_COLORS[nType];

                return (
                  <button
                    key={notification.id}
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

function getTitleForType(type: string): string {
  switch (type) {
    case 'low_stock':
      return 'Stok Rendah';
    case 'large_transaction':
      return 'Transaksi Besar';
    case 'order_ready':
      return 'Pesanan Siap';
    case 'shift_reminder':
      return 'Pengingat Shift';
    case 'system_alert':
      return 'Peringatan Sistem';
    default:
      return 'Notifikasi';
  }
}
