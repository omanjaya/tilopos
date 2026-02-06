import { UtensilsCrossed, Timer, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KdsEmptyStateProps {
  type: 'loading' | 'error' | 'no-orders' | 'no-filtered-orders';
  onRetry?: () => void;
  onShowAll?: () => void;
}

export function KdsEmptyState({ type, onRetry, onShowAll }: KdsEmptyStateProps) {
  if (type === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-orange-400" />
          <p className="mt-4 text-lg text-zinc-400">Memuat pesanan...</p>
        </div>
      </div>
    );
  }

  if (type === 'error') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-400">Gagal memuat pesanan</p>
          <Button
            variant="outline"
            className="mt-4 border-zinc-600 text-zinc-300 hover:bg-zinc-800"
            onClick={onRetry}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  if (type === 'no-orders') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <UtensilsCrossed className="mx-auto h-16 w-16 text-zinc-600" />
          <p className="mt-4 text-xl font-medium text-zinc-400">Tidak ada pesanan</p>
          <p className="mt-1 text-sm text-zinc-500">Pesanan baru akan muncul secara otomatis</p>
        </div>
      </div>
    );
  }

  if (type === 'no-filtered-orders') {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <Timer className="mx-auto h-12 w-12 text-zinc-600" />
          <p className="mt-3 text-lg font-medium text-zinc-400">
            Tidak ada pesanan untuk filter ini
          </p>
          <Button
            variant="ghost"
            className="mt-2 text-orange-400 hover:text-orange-300"
            onClick={onShowAll}
          >
            Tampilkan semua
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
