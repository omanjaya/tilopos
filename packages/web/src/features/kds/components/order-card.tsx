import { useState } from 'react';
import {
  Check,
  Crown,
  AlertTriangle,
  Loader2,
  ArrowRightCircle,
  Utensils,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CookingTimer } from './cooking-timer';

export interface KDSOrderItem {
  name: string;
  quantity: number;
  modifiers?: string[];
  notes?: string;
  status: 'pending' | 'preparing' | 'ready';
}

export interface KDSOrderData {
  id: string;
  orderNumber: string;
  type: 'dine_in' | 'takeaway' | 'delivery';
  tableName?: string;
  items: KDSOrderItem[];
  priority: 'normal' | 'rush' | 'vip';
  createdAt: string;
}

export interface KDSOrderCardProps {
  order: KDSOrderData;
  onItemComplete: (itemIndex: number) => void;
  onOrderComplete: () => void;
  onBump: () => void;
  targetMinutes?: number;
}

const typeIcons: Record<KDSOrderData['type'], typeof Utensils> = {
  dine_in: Utensils,
  takeaway: ShoppingBag,
  delivery: Truck,
};

const typeLabels: Record<KDSOrderData['type'], string> = {
  dine_in: 'Dine In',
  takeaway: 'Takeaway',
  delivery: 'Delivery',
};

const typeBadgeStyles: Record<KDSOrderData['type'], string> = {
  dine_in: 'bg-blue-600 text-white',
  takeaway: 'bg-purple-600 text-white',
  delivery: 'bg-teal-600 text-white',
};

function getPriorityBorderClass(priority: KDSOrderData['priority']): string {
  switch (priority) {
    case 'vip':
      return 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/10';
    case 'rush':
      return 'border-red-500 ring-1 ring-red-500/20';
    default:
      return 'border-zinc-700';
  }
}

function PriorityIndicator({ priority }: { priority: KDSOrderData['priority'] }) {
  if (priority === 'vip') {
    return (
      <Badge className="bg-amber-500 text-black font-bold gap-1">
        <Crown className="h-3 w-3" />
        VIP
      </Badge>
    );
  }
  if (priority === 'rush') {
    return (
      <Badge className="bg-red-500 text-white font-bold gap-1">
        <AlertTriangle className="h-3 w-3" />
        Rush
      </Badge>
    );
  }
  return null;
}

function OrderItemRow({
  item,
  index,
  onComplete,
  isCompleting,
}: {
  item: KDSOrderItem;
  index: number;
  onComplete: (index: number) => void;
  isCompleting: boolean;
}) {
  const isDone = item.status === 'ready';

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-2 rounded-lg px-3 py-2.5 transition-all',
        isDone
          ? 'bg-green-900/30 opacity-60'
          : item.status === 'preparing'
            ? 'bg-yellow-900/20 border border-yellow-800/30'
            : 'bg-zinc-800/60',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
              isDone
                ? 'bg-green-700 text-green-100'
                : 'bg-zinc-700 text-zinc-200',
            )}
          >
            {item.quantity}
          </span>
          <span
            className={cn(
              'text-sm font-semibold text-white',
              isDone && 'line-through text-zinc-400',
            )}
          >
            {item.name}
          </span>
          {isDone && <Check className="h-4 w-4 text-green-400" />}
        </div>
        {item.modifiers && item.modifiers.length > 0 && (
          <p className="mt-1 ml-8 text-xs text-zinc-400">{item.modifiers.join(', ')}</p>
        )}
        {item.notes && (
          <p className="mt-1 ml-8 text-xs italic text-yellow-400/80">
            {item.notes}
          </p>
        )}
      </div>
      {!isDone && (
        <Button
          size="sm"
          className="shrink-0 bg-green-600 text-white hover:bg-green-700 min-h-[40px] min-w-[40px]"
          onClick={() => onComplete(index)}
          disabled={isCompleting}
        >
          {isCompleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}

export function OrderCard({
  order,
  onItemComplete,
  onOrderComplete,
  onBump,
  targetMinutes = 15,
}: KDSOrderCardProps) {
  const [completingIndex, setCompletingIndex] = useState<number | null>(null);
  const [isBumping, setIsBumping] = useState(false);

  const allDone = order.items.every((item) => item.status === 'ready');
  const completedCount = order.items.filter((item) => item.status === 'ready').length;
  const totalCount = order.items.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const TypeIcon = typeIcons[order.type];

  function handleItemComplete(index: number) {
    setCompletingIndex(index);
    onItemComplete(index);
    setTimeout(() => setCompletingIndex(null), 500);
  }

  function handleBump() {
    setIsBumping(true);
    onBump();
    setTimeout(() => setIsBumping(false), 500);
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border-2 transition-all duration-200',
        allDone
          ? 'border-green-600 bg-green-900/20'
          : getPriorityBorderClass(order.priority),
        !allDone && order.priority === 'normal' && 'bg-zinc-900',
        !allDone && order.priority !== 'normal' && 'bg-zinc-900',
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
      <div className="flex items-center justify-between border-b border-zinc-700/50 px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xl font-bold text-white">#{order.orderNumber}</span>
          <PriorityIndicator priority={order.priority} />
        </div>
        <CookingTimer startTime={order.createdAt} targetMinutes={targetMinutes} />
      </div>

      {/* Order Info Bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/50">
        <Badge className={cn('gap-1', typeBadgeStyles[order.type])}>
          <TypeIcon className="h-3 w-3" />
          {typeLabels[order.type]}
        </Badge>
        {order.tableName && (
          <Badge className="bg-blue-600/80 text-white">{order.tableName}</Badge>
        )}
        <span className="ml-auto text-xs text-zinc-500">
          {completedCount}/{totalCount} items
        </span>
      </div>

      {/* Items List */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {order.items.map((item, index) => (
          <OrderItemRow
            key={`${order.id}-item-${index}`}
            item={item}
            index={index}
            onComplete={handleItemComplete}
            isCompleting={completingIndex === index}
          />
        ))}
      </div>

      {/* Card Footer */}
      <div className="border-t border-zinc-700/50 px-4 py-3">
        {allDone ? (
          <div className="space-y-2">
            <p className="text-center text-sm font-semibold text-green-400">
              Semua item selesai
            </p>
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white gap-2 min-h-[44px] font-semibold"
              onClick={() => onOrderComplete()}
            >
              <Check className="h-4 w-4" />
              Selesai
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-white gap-2 min-h-[44px]"
            onClick={handleBump}
            disabled={isBumping}
          >
            {isBumping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRightCircle className="h-4 w-4" />
            )}
            Bump
          </Button>
        )}
      </div>
    </div>
  );
}
