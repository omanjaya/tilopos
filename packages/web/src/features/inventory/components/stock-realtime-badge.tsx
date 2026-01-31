import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeInventory } from '@/hooks/use-realtime';
import { useToast } from '@/hooks/use-toast';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';

export function StockRealtimeBadge() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const user = useAuthStore((s) => s.user);
  const outletId = selectedOutletId || user?.outletId || '';

  const [pendingUpdates, setPendingUpdates] = useState(0);

  const handleStockUpdated = useCallback(
    (event: { outletId: string; productId: string; variantId: string | null; quantity: number; occurredOn: string }) => {
      // Only count updates for the current outlet
      if (event.outletId === outletId) {
        setPendingUpdates((prev) => prev + 1);
        toast({
          title: 'Stok diperbarui',
          description: `Stok produk telah diperbarui dari sumber lain.`,
        });
        // Auto-refresh the stock query
        void queryClient.invalidateQueries({ queryKey: ['stock-levels', outletId] });
      }
    },
    [outletId, toast, queryClient],
  );

  const handleTransferStatusChanged = useCallback(
    (event: {
      transferId: string;
      sourceOutletId: string;
      destinationOutletId: string;
      previousStatus: string;
      newStatus: string;
    }) => {
      const isRelevant =
        event.sourceOutletId === outletId || event.destinationOutletId === outletId;
      if (isRelevant) {
        setPendingUpdates((prev) => prev + 1);
        const statusLabel =
          event.newStatus === 'shipped'
            ? 'dikirim'
            : event.newStatus === 'received'
              ? 'diterima'
              : event.newStatus === 'approved'
                ? 'disetujui'
                : event.newStatus;
        toast({
          title: 'Transfer stok diperbarui',
          description: `Transfer #${event.transferId.slice(0, 8)} status: ${statusLabel}`,
        });
        // Refresh transfers and stock queries
        void queryClient.invalidateQueries({ queryKey: ['stock-levels', outletId] });
        void queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      }
    },
    [outletId, toast, queryClient],
  );

  const { isConnected } = useRealtimeInventory({
    onStockUpdated: handleStockUpdated,
    onTransferStatusChanged: handleTransferStatusChanged,
  });

  const handleDismiss = () => {
    setPendingUpdates(0);
  };

  if (pendingUpdates === 0) {
    return (
      <div className="flex items-center gap-1.5" title={isConnected ? 'Real-time aktif' : 'Tidak terhubung'}>
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            isConnected ? 'bg-green-500' : 'bg-gray-400',
          )}
        />
      </div>
    );
  }

  return (
    <button
      onClick={handleDismiss}
      className="flex items-center gap-1.5 rounded-md bg-blue-500/10 px-2 py-1 text-xs text-blue-600 transition-colors hover:bg-blue-500/20 dark:text-blue-400"
      title="Klik untuk menghapus badge"
    >
      <RefreshCw className="h-3 w-3" />
      <Badge variant="secondary" className="h-5 min-w-[1.25rem] px-1 text-[10px]">
        {pendingUpdates}
      </Badge>
      <span className="hidden sm:inline">pembaruan stok</span>
    </button>
  );
}
