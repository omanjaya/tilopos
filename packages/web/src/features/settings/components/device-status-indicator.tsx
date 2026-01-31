import { cn } from '@/lib/utils';

export type DeviceSyncStatus = 'online' | 'offline' | 'syncing';

interface DeviceStatusIndicatorProps {
  status: DeviceSyncStatus;
  lastSyncTime?: string | null;
  className?: string;
}

function formatLastSync(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Belum pernah sync';

  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();

  if (diff < 60_000) return 'Baru saja';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} menit lalu`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} jam lalu`;

  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_CONFIG: Record<DeviceSyncStatus, { dotColor: string; pulseColor: string; label: string; animate: boolean }> = {
  online: {
    dotColor: 'bg-green-500',
    pulseColor: '',
    label: 'Online',
    animate: false,
  },
  offline: {
    dotColor: 'bg-red-500',
    pulseColor: '',
    label: 'Offline',
    animate: false,
  },
  syncing: {
    dotColor: 'bg-yellow-500',
    pulseColor: 'bg-yellow-500/40',
    label: 'Menyinkronkan',
    animate: true,
  },
};

export function DeviceStatusIndicator({ status, lastSyncTime, className }: DeviceStatusIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const tooltipText = `${config.label} - Terakhir sync: ${formatLastSync(lastSyncTime)}`;

  return (
    <div
      className={cn('inline-flex items-center gap-1.5', className)}
      title={tooltipText}
    >
      <span className="relative flex h-3 w-3">
        {config.animate && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              config.pulseColor,
            )}
          />
        )}
        <span
          className={cn(
            'relative inline-flex h-3 w-3 rounded-full',
            config.dotColor,
          )}
        />
      </span>
      <span className="text-xs text-muted-foreground">{config.label}</span>
    </div>
  );
}
