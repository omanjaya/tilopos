import { Bell, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CookingTimer } from './cooking-timer';
import { OrderTimer, getElapsedColor } from './order-timer';
import { PriorityBadge, getPriorityBorderClass } from './priority-badge';
import { OrderItemRow } from './order-item-row';
import type { KDSOrder, KDSOrderPriority } from '@/types/kds.types';

interface KdsOrderCardProps {
  order: KDSOrder;
  onBumpItem: (itemId: string) => void;
  bumpingItemId: string | undefined;
  onNotifyCashier: (orderId: string) => void;
  isNotifying: boolean;
}

export function KdsOrderCard({
  order,
  onBumpItem,
  bumpingItemId,
  onNotifyCashier,
  isNotifying,
}: KdsOrderCardProps) {
  const items = order.items ?? [];

  // Guard: Skip rendering if no items
  if (items.length === 0) {
    return null;
  }

  const allDone = items.every((item) => item.status === 'ready' || item.status === 'served');

  const completedCount = items.filter((i) => i.status === 'ready' || i.status === 'served').length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const priority: KDSOrderPriority = order.priority ?? 'normal';
  const priorityBorderClass = getPriorityBorderClass(priority);

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border-2 transition-colors',
        allDone
          ? 'border-green-600 bg-green-900/20'
          : getElapsedColor(order.elapsedMinutes),
        !allDone && priorityBorderClass,
        priority === 'vip' && !allDone && 'shadow-lg shadow-amber-500/10',
      )}
    >
      {/* Progress Bar */}
      {!allDone && (
        <div className="h-1 w-full overflow-hidden rounded-t-xl bg-zinc-800">
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xl font-bold text-white">#{order.orderNumber}</span>
          {order.tableName && (
            <Badge className="bg-blue-600 text-white">{order.tableName}</Badge>
          )}
          <Badge variant="outline" className="border-zinc-600 text-zinc-400">
            {order.orderType}
          </Badge>
          <PriorityBadge priority={priority} />
        </div>
        <div className="flex items-center gap-1.5">
          {!allDone ? (
            <CookingTimer startTime={order.createdAt} targetMinutes={15} />
          ) : (
            <OrderTimer elapsedMinutes={order.elapsedMinutes} />
          )}
        </div>
      </div>

      {/* Progress Info */}
      {!allDone && (
        <div className="px-4 py-1.5 text-xs text-zinc-500 border-b border-zinc-800/50">
          {completedCount}/{totalCount} item selesai
        </div>
      )}

      {/* Items */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {items.map((item) => (
          <OrderItemRow
            key={item.id}
            item={item}
            onBump={onBumpItem}
            isBumping={bumpingItemId === item.id}
          />
        ))}
      </div>

      {/* Card Footer */}
      {allDone && (
        <div className="border-t border-green-700 px-4 py-3 space-y-2">
          <span className="block text-sm font-semibold text-green-400 text-center">
            Semua item selesai
          </span>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 min-h-[44px]"
            onClick={() => onNotifyCashier(order.id)}
            disabled={isNotifying}
          >
            {isNotifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            Beritahu Kasir
          </Button>
        </div>
      )}
    </div>
  );
}
