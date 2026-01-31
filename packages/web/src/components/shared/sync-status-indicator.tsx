import { useState } from 'react';
import { useSync, type SyncStatus } from '@/hooks/use-sync';
import { cn } from '@/lib/utils';
import { RefreshCw, Wifi, WifiOff, AlertTriangle, Check } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

const STATUS_CONFIG: Record<SyncStatus, {
  color: string;
  bgColor: string;
  icon: React.ElementType;
  label: string;
  animate?: boolean;
}> = {
  synced: {
    color: 'bg-green-500',
    bgColor: 'bg-green-500/10',
    icon: Check,
    label: 'Tersinkron',
  },
  syncing: {
    color: 'bg-blue-500',
    bgColor: 'bg-blue-500/10',
    icon: RefreshCw,
    label: 'Menyinkronkan...',
    animate: true,
  },
  pending: {
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-500/10',
    icon: Wifi,
    label: 'Menunggu sinkronisasi',
  },
  offline: {
    color: 'bg-gray-400',
    bgColor: 'bg-gray-400/10',
    icon: WifiOff,
    label: 'Offline',
  },
  error: {
    color: 'bg-red-500',
    bgColor: 'bg-red-500/10',
    icon: AlertTriangle,
    label: 'Gagal sinkronisasi',
  },
};

function formatSyncTime(timestamp: number | null): string {
  if (!timestamp) return 'Belum pernah';

  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return 'Baru saja';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`;
  return new Date(timestamp).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SyncStatusIndicator() {
  const {
    syncStatus,
    pendingCount,
    failedCount,
    conflicts,
    lastSyncTime,
    triggerSync,
  } = useSync();

  const [isSyncing, setIsSyncing] = useState(false);

  const config = STATUS_CONFIG[syncStatus];
  const StatusIcon = config.icon;

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await triggerSync();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'relative flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent',
            config.bgColor,
          )}
          aria-label={`Sync status: ${config.label}`}
        >
          <span className={cn('h-2 w-2 rounded-full', config.color)} />
          <StatusIcon
            className={cn(
              'h-3.5 w-3.5',
              config.animate && 'animate-spin',
            )}
          />
          {pendingCount > 0 && (
            <span className="min-w-[1rem] rounded-full bg-yellow-500 px-1 text-center text-[10px] font-medium text-white">
              {pendingCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64 p-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={cn('h-2.5 w-2.5 rounded-full', config.color)} />
            <span className="text-sm font-medium">{config.label}</span>
          </div>

          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Sinkronisasi terakhir</span>
              <span className="font-medium text-foreground">
                {formatSyncTime(lastSyncTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Antrian pending</span>
              <span className="font-medium text-foreground">
                {pendingCount} item
              </span>
            </div>
            {failedCount > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Gagal</span>
                <span className="font-medium">{failedCount} item</span>
              </div>
            )}
            {conflicts > 0 && (
              <div className="flex justify-between text-yellow-600">
                <span>Konflik</span>
                <span className="font-medium">{conflicts} item</span>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={syncStatus === 'offline' || isSyncing || syncStatus === 'syncing'}
            onClick={() => void handleSyncNow()}
          >
            <RefreshCw className={cn('mr-2 h-3.5 w-3.5', isSyncing && 'animate-spin')} />
            {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
