import { RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import type { OfflineProblemItem } from '@/hooks/use-offline-pos';

interface OfflineBannerProps {
    isOffline: boolean;
    pendingCount: number;
    syncStatus: 'idle' | 'syncing' | 'error';
    onManualSync: () => void;
    /** Offline sales the server rejected; need a retry or an explicit discard */
    failedItems?: OfflineProblemItem[];
    onRetryItem?: (id: string) => void;
    onDiscardItem?: (id: string) => void;
}

export function OfflineBanner({
    isOffline,
    pendingCount,
    syncStatus,
    onManualSync,
    failedItems = [],
    onRetryItem,
    onDiscardItem,
}: OfflineBannerProps) {
    if (!isOffline && pendingCount === 0 && failedItems.length === 0) {
        return null;
    }

    const handleDiscard = (item: OfflineProblemItem) => {
        const ok = window.confirm(
            `Hapus transaksi offline ${formatCurrency(item.total)} secara permanen? Transaksi ini tidak akan tercatat di server.`,
        );
        if (ok) onDiscardItem?.(item.id);
    };

    return (
        <div className="shrink-0">
            {(isOffline || pendingCount > 0) && (
                <div
                    className={cn(
                        'px-4 py-2 text-sm flex items-center justify-between',
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
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onManualSync}>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Sinkronkan
                        </Button>
                    )}
                </div>
            )}
            {failedItems.length > 0 && (
                <div role="alert" className="px-4 py-2 text-sm bg-destructive/10 text-destructive space-y-1">
                    <p className="font-medium">
                        {failedItems.length} transaksi offline ditolak server dan perlu ditindaklanjuti
                    </p>
                    <ul className="space-y-1">
                        {failedItems.map((item) => (
                            <li key={item.id} className="flex items-center justify-between gap-2">
                                <span className="truncate">
                                    {new Date(item.occurredAt).toLocaleString('id-ID')} · {formatCurrency(item.total)}
                                    {item.error ? ` — ${item.error}` : ''}
                                </span>
                                <span className="flex shrink-0 gap-1">
                                    <Button
                                        variant="ghost" size="sm" className="h-7 text-xs"
                                        disabled={isOffline}
                                        onClick={() => onRetryItem?.(item.id)}
                                    >
                                        <RotateCcw className="h-3 w-3 mr-1" />
                                        Coba Lagi
                                    </Button>
                                    <Button
                                        variant="ghost" size="sm" className="h-7 text-xs"
                                        onClick={() => handleDiscard(item)}
                                    >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Hapus
                                    </Button>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
