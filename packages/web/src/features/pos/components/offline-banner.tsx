import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OfflineBannerProps {
    isOffline: boolean;
    pendingCount: number;
    syncStatus: 'idle' | 'syncing' | 'error';
    onManualSync: () => void;
}

export function OfflineBanner({
    isOffline,
    pendingCount,
    syncStatus,
    onManualSync,
}: OfflineBannerProps) {
    if (!isOffline && pendingCount === 0) {
        return null;
    }

    return (
        <div
            className={cn(
                'px-4 py-2 text-sm flex items-center justify-between shrink-0',
                isOffline
                    ? 'bg-destructive/10 text-destructive'
                    : syncStatus === 'syncing'
                      ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                      : 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
            )}
        >
            <span>
                {isOffline
                    ? `Mode Offline — ${pendingCount} transaksi menunggu sinkronisasi`
                    : syncStatus === 'syncing'
                      ? 'Menyinkronkan transaksi offline...'
                      : `${pendingCount} transaksi belum disinkronkan`}
            </span>
            {!isOffline && pendingCount > 0 && syncStatus !== 'syncing' && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={onManualSync}
                >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Sinkronkan
                </Button>
            )}
        </div>
    );
}
