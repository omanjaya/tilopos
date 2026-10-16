/**
 * Offline POS transaction payload.
 *
 * The payload queued offline is exactly what POST /pos/transactions accepts
 * (backend CreateTransactionDto, forbidNonWhitelisted) plus the idempotency
 * fields `clientTransactionId` (UUID) and `occurredAt` (ISO string).
 * Anything else (local ids, createdAt, employeeId) is stripped: the backend
 * derives the employee from the JWT.
 */

export type OfflineOrderType = 'dine_in' | 'takeaway' | 'delivery';

export interface OfflineTransactionItem {
  productId?: string;
  variantId?: string;
  bundleId?: string;
  quantity: number;
  modifierIds?: string[];
  notes?: string;
  unitPrice?: number;
}

export interface OfflinePayment {
  method: string;
  amount: number;
  referenceNumber?: string;
}

export interface OfflineDiscount {
  type: 'percentage' | 'fixed';
  value: number;
  promotionId?: string;
  voucherCode?: string;
}

export interface OfflineTransactionPayload {
  clientTransactionId: string;
  occurredAt: string;
  outletId: string;
  shiftId: string;
  orderType: OfflineOrderType;
  items: OfflineTransactionItem[];
  payments: OfflinePayment[];
  customerId?: string;
  tableId?: string;
  discounts?: OfflineDiscount[];
  notes?: string;
}

/** Input accepted by `toOfflineTransactionPayload` (extra keys are ignored). */
export type OfflineTransactionInput = Omit<OfflineTransactionPayload, 'clientTransactionId' | 'occurredAt'> & {
  clientTransactionId?: string;
  occurredAt?: string | number | Date;
};

function pickDefined<T extends object>(obj: T): T {
  const out = {} as T;
  for (const [key, value] of Object.entries(obj) as [keyof T, T[keyof T]][]) {
    if (value !== undefined && value !== null && value !== '') out[key] = value;
  }
  return out;
}

export function generateClientTransactionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC4122 v4 from crypto.getRandomValues (randomUUID is missing on non-secure origins)
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Build the whitelisted payload for POST /pos/transactions.
 */
export function toOfflineTransactionPayload(input: OfflineTransactionInput): OfflineTransactionPayload {
  const occurred = input.occurredAt ?? Date.now();
  const occurredAt = new Date(occurred).toISOString();

  const payload: OfflineTransactionPayload = {
    clientTransactionId: input.clientTransactionId ?? generateClientTransactionId(),
    occurredAt,
    outletId: input.outletId,
    shiftId: input.shiftId,
    orderType: input.orderType,
    items: input.items.map((item) =>
      pickDefined({
        productId: item.productId,
        variantId: item.variantId,
        bundleId: item.bundleId,
        quantity: item.quantity,
        modifierIds: item.modifierIds && item.modifierIds.length > 0 ? item.modifierIds : undefined,
        notes: item.notes,
        unitPrice: item.unitPrice,
      }),
    ),
    payments: input.payments.map((p) =>
      pickDefined({ method: p.method, amount: p.amount, referenceNumber: p.referenceNumber }),
    ),
  };

  if (input.customerId) payload.customerId = input.customerId;
  if (input.tableId) payload.tableId = input.tableId;
  if (input.notes) payload.notes = input.notes;
  if (input.discounts && input.discounts.length > 0) {
    payload.discounts = input.discounts.map((d) =>
      pickDefined({ type: d.type, value: d.value, promotionId: d.promotionId, voucherCode: d.voucherCode }),
    );
  }

  return payload;
}
