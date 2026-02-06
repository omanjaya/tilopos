import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { KDSOrderItem } from '@/types/kds.types';

interface OrderItemRowProps {
  item: KDSOrderItem;
  onBump: (id: string) => void;
  isBumping: boolean;
}

export function OrderItemRow({ item, onBump, isBumping }: OrderItemRowProps) {
  const isDone = item.status === 'ready' || item.status === 'served';

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-2 rounded-md px-3 py-2',
        isDone ? 'bg-green-900/30 opacity-60' : 'bg-zinc-800/50',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('text-lg font-bold text-white', isDone && 'line-through')}>
            {item.quantity}x
          </span>
          <span className={cn('text-lg font-medium text-white', isDone && 'line-through')}>
            {item.productName}
          </span>
        </div>
        {item.modifiers && item.modifiers.length > 0 && (
          <p className="mt-0.5 text-sm text-zinc-400">{item.modifiers.join(', ')}</p>
        )}
        {item.notes && <p className="mt-0.5 text-sm italic text-zinc-500">{item.notes}</p>}
      </div>
      {!isDone && (
        <Button
          size="sm"
          className="shrink-0 bg-green-600 text-white hover:bg-green-700 min-h-[44px] min-w-[44px]"
          onClick={() => onBump(item.id)}
          disabled={isBumping}
        >
          {isBumping ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
