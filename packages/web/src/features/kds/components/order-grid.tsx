import { KdsOrderCard } from './kds-order-card';
import type { KDSOrder } from '@/types/kds.types';

interface OrderGridProps {
  orders: KDSOrder[];
  onBumpItem: (itemId: string) => void;
  bumpingItemId: string | undefined;
  onNotifyCashier: (orderId: string) => void;
  notifyingOrderId: string | undefined;
  title?: string;
}

export function OrderGrid({
  orders,
  onBumpItem,
  bumpingItemId,
  onNotifyCashier,
  notifyingOrderId,
  title,
}: OrderGridProps) {
  if (orders.length === 0) return null;

  return (
    <div>
      {title && (
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">
          {title} ({orders.length})
        </h2>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {orders.map((order) => (
          <KdsOrderCard
            key={order.id}
            order={order}
            onBumpItem={onBumpItem}
            bumpingItemId={bumpingItemId}
            onNotifyCashier={onNotifyCashier}
            isNotifying={notifyingOrderId === order.id}
          />
        ))}
      </div>
    </div>
  );
}
