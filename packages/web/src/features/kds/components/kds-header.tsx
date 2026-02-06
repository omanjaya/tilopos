import { ArrowLeft, UtensilsCrossed, RefreshCw, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatClock } from '../hooks/useKdsTimer';

interface KdsHeaderProps {
  currentTime: Date;
  activeOrderCount: number;
  outletName: string;
  onBack: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function KdsHeader({
  currentTime,
  activeOrderCount,
  outletName,
  onBack,
  onRefresh,
  isRefreshing,
}: KdsHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-700 bg-zinc-950 px-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800 min-h-[44px] min-w-[44px]"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <UtensilsCrossed className="h-6 w-6 text-orange-400" />
          <div>
            <h1 className="text-lg font-bold">Kitchen Display</h1>
            <p className="text-xs text-zinc-400">{outletName}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Badge className="bg-orange-600 text-white text-sm px-3 py-1">
          {activeOrderCount} pesanan aktif
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-400 hover:text-white hover:bg-zinc-800 min-h-[44px] min-w-[44px]"
          onClick={onRefresh}
        >
          {isRefreshing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <RefreshCw className="h-5 w-5" />
          )}
        </Button>
        <div className="font-mono text-2xl font-bold text-zinc-300">
          {formatClock(currentTime)}
        </div>
      </div>
    </header>
  );
}
