import { useState } from 'react';
import { useSync, type SyncStatus } from '@/hooks/use-sync';
import { cn } from '@/lib/utils';
import {
    RefreshCw,
    Wifi,
    WifiOff,
    AlertTriangle,
    Check,
    CloudOff,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const STATUS_CONFIG: Record<
    SyncStatus,
    {
        dotColor: string;
        bgColor: string;
        icon: React.ElementType;
        label: string;
        animate?: boolean;
    }
> = {
    synced: {
        dotColor: 'bg-green-500',
        bgColor: 'bg-green-500/10',
        icon: Check,
        label: 'Tersinkron',
    },
    syncing: {
        dotColor: 'bg-blue-500',
        bgColor: 'bg-blue-500/10',
        icon: RefreshCw,
        label: 'Menyinkronkan...',
        animate: true,
    },
    pending: {
        dotColor: 'bg-yellow-500',
        bgColor: 'bg-yellow-500/10',
        icon: Wifi,
        label: 'Menunggu sinkronisasi',
    },
    offline: {
        dotColor: 'bg-gray-400',
        bgColor: 'bg-gray-400/10',
        icon: WifiOff,
        label: 'Offline',
    },
    error: {
        dotColor: 'bg-red-500',
        bgColor: 'bg-red-500/10',
        icon: AlertTriangle,
        label: 'Gagal sinkronisasi',
    },
};

function formatRelativeTime(timestamp: number | null): string {
    if (!timestamp) return 'Belum pernah';

    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60_000) return 'Baru saja';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} menit lalu`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} jam lalu`;

    return new Date(timestamp).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function SyncIndicator() {
    const {
        syncStatus,
        pendingCount,
        failedCount,
        conflicts,
        lastSyncTime,
        isOnline,
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
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className={cn(
                        'relative flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent',
                        config.bgColor,
                    )}
                    title={config.label}
                    aria-label={`Sync status: ${config.label}`}
                >
                    <span
                        className={cn('h-2 w-2 rounded-full', config.dotColor)}
                    />
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
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-72 p-0">
                <div className="p-4 space-y-4">
                    {/* Status header */}
                    <div className="flex items-center gap-2">
                        <span
                            className={cn(
                                'h-2.5 w-2.5 rounded-full',
                                config.dotColor,
                            )}
                        />
                        <span className="text-sm font-medium">
                            {config.label}
                        </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                            <span>Sinkronisasi terakhir</span>
                            <span className="font-medium text-foreground">
                                {formatRelativeTime(lastSyncTime)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Perubahan tertunda</span>
                            <span className="font-medium text-foreground">
                                {pendingCount} item
                            </span>
                        </div>
                        {failedCount > 0 && (
                            <div className="flex justify-between text-red-500">
                                <span>Gagal</span>
                                <span className="font-medium">
                                    {failedCount} item
                                </span>
                            </div>
                        )}
                        {conflicts > 0 && (
                            <div className="flex justify-between text-yellow-600">
                                <span>Konflik</span>
                                <span className="font-medium">
                                    {conflicts} item
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Offline message */}
                    {!isOnline && (
                        <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
                            <CloudOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>
                                Anda sedang offline. Perubahan akan
                                disinkronkan saat terhubung kembali.
                            </span>
                        </div>
                    )}

                    {/* Sync Now button */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={
                            !isOnline ||
                            isSyncing ||
                            syncStatus === 'syncing'
                        }
                        onClick={() => void handleSyncNow()}
                    >
                        <RefreshCw
                            className={cn(
                                'mr-2 h-3.5 w-3.5',
                                isSyncing && 'animate-spin',
                            )}
                        />
                        {isSyncing
                            ? 'Menyinkronkan...'
                            : 'Sinkronkan Sekarang'}
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
