import type {
    CartItem,
    DiscountRequest,
    OrderType,
    PreviewTransactionRequest,
    TransactionItemRequest,
} from '@/types/pos.types';

/** Backend cash rounding step (sale-pricing.service CASH_ROUNDING_STEP, ROUND_HALF_UP). */
export const CASH_ROUNDING_STEP = 500;

export function roundCash(amount: number): number {
    return Math.round(amount / CASH_ROUNDING_STEP) * CASH_ROUNDING_STEP;
}

/**
 * Item payload for POST /pos/transactions (and /preview). A custom unit price is only
 * sent for roles allowed to edit prices (supervisor and above); the backend re-validates it.
 */
export function toItemRequests(items: CartItem[], canEditPrice: boolean): TransactionItemRequest[] {
    return items.map((item) => ({
        productId: item.bundleId ? undefined : item.productId,
        variantId: item.variantId,
        bundleId: item.bundleId,
        quantity: item.quantity,
        modifierIds: item.modifiers.map((m) => m.id),
        notes: item.notes,
        unitPrice: canEditPrice && item.originalPrice !== undefined && item.originalPrice !== item.price
            ? item.price
            : undefined,
    }));
}

/** Manual cart discount as the backend DiscountDto list (capped per role server-side). */
export function toDiscountRequests(discountAmount: number, discountPercent: number): DiscountRequest[] | undefined {
    if (discountAmount <= 0 && discountPercent <= 0) return undefined;
    return [
        {
            type: discountPercent > 0 ? 'percentage' : 'fixed',
            value: discountPercent > 0 ? discountPercent : discountAmount,
        },
    ];
}

interface CartSnapshot {
    items: CartItem[];
    orderType: OrderType;
    customerId?: string;
    discountAmount: number;
    discountPercent: number;
}

/** Body for POST /pos/transactions/preview built from the current cart. */
export function toPreviewRequest(
    cart: CartSnapshot,
    outletId: string | undefined,
    canEditPrice: boolean,
    payments?: PreviewTransactionRequest['payments'],
): PreviewTransactionRequest {
    return {
        outletId: outletId || undefined,
        customerId: cart.customerId,
        orderType: cart.orderType,
        items: toItemRequests(cart.items, canEditPrice),
        discounts: toDiscountRequests(cart.discountAmount, cart.discountPercent),
        payments,
    };
}
