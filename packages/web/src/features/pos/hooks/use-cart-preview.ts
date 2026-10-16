import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { posApi } from '@/api/endpoints/pos.api';
import { hasRole } from '@/config/permissions';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';
import { useUIStore } from '@/stores/ui.store';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { roundCash, toPreviewRequest } from '../utils/cart-request';

export interface CartTotals {
    /** Grand total without cash rounding (what non-cash / mixed payments must cover). */
    rawTotal: number;
    /** Grand total when every payment is cash (Rp500 rounding). */
    cashTotal: number;
    /** True when the totals come from POST /pos/transactions/preview. */
    fromServer: boolean;
    isLoading: boolean;
    error: unknown;
}

/**
 * Server-side totals of the current cart. The backend applies Rp500 rounding only
 * when every payment is cash, so the payment panel needs both the raw and the cash
 * total. Offline (or when the preview fails) the local cart total is used.
 */
export function useCartPreview(enabled: boolean): CartTotals {
    const isOnline = useOnlineStatus();
    const role = useAuthStore((s) => s.user?.role);
    const userOutletId = useAuthStore((s) => s.user?.outletId);
    const selectedOutletId = useUIStore((s) => s.selectedOutletId);
    const outletId = selectedOutletId ?? userOutletId ?? undefined;
    const items = useCartStore((s) => s.items);
    const orderType = useCartStore((s) => s.orderType);
    const customerId = useCartStore((s) => s.customerId);
    const discountAmount = useCartStore((s) => s.discountAmount);
    const discountPercent = useCartStore((s) => s.discountPercent);
    const localTotal = useCartStore((s) => s.total);
    const canEditPrice = hasRole(role, 'SUPERVISION');

    const request = useMemo(
        () =>
            toPreviewRequest(
                { items, orderType, customerId, discountAmount, discountPercent },
                outletId,
                canEditPrice,
            ),
        [items, orderType, customerId, discountAmount, discountPercent, outletId, canEditPrice],
    );

    const query = useQuery({
        queryKey: ['pos', 'cart-preview', request],
        queryFn: () => posApi.previewTransaction(request),
        enabled: enabled && isOnline && items.length > 0,
        staleTime: 30_000,
        retry: false,
    });

    if (query.data) {
        const rawTotal = query.data.grandTotal;
        return {
            rawTotal,
            cashTotal: roundCash(rawTotal),
            fromServer: true,
            isLoading: false,
            error: null,
        };
    }
    return {
        rawTotal: localTotal,
        cashTotal: localTotal,
        fromServer: false,
        isLoading: query.isLoading && query.fetchStatus !== 'idle',
        error: query.error,
    };
}
