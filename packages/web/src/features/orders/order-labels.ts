type BadgeVariant = 'default' | 'destructive' | 'outline' | 'secondary';

export interface BadgeInfo {
  label: string;
  variant: BadgeVariant;
}

/** Backend OrderStatus enum (includes 'confirmed', e.g. from self-order). */
const STATUS_MAP: Record<string, BadgeInfo> = {
  pending: { label: 'Menunggu', variant: 'secondary' },
  confirmed: { label: 'Dikonfirmasi', variant: 'secondary' },
  preparing: { label: 'Diproses', variant: 'outline' },
  ready: { label: 'Siap', variant: 'default' },
  served: { label: 'Disajikan', variant: 'default' },
  completed: { label: 'Selesai', variant: 'default' },
  cancelled: { label: 'Dibatalkan', variant: 'destructive' },
};

const ORDER_TYPE_MAP: Record<string, BadgeInfo> = {
  dine_in: { label: 'Makan di Tempat', variant: 'default' },
  takeaway: { label: 'Bawa Pulang', variant: 'secondary' },
  delivery: { label: 'Antar', variant: 'outline' },
};

/** Safe lookup: unknown statuses render their raw value instead of crashing. */
export function orderStatusBadge(status: string): BadgeInfo {
  return STATUS_MAP[status] ?? { label: status, variant: 'secondary' };
}

export function orderTypeBadge(orderType: string): BadgeInfo {
  return ORDER_TYPE_MAP[orderType] ?? { label: orderType, variant: 'secondary' };
}

/** Statuses from which PUT /orders/:id/cancel is allowed (backend OrdersService.cancel). */
export const CANCELLABLE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'];
