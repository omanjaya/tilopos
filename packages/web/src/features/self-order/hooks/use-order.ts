import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { selfOrderApi } from '@/api/endpoints/self-order.api';
import type { CartItem } from './use-cart';

type OrderStatus = 'idle' | 'submitting' | 'success' | 'error';

export interface SubmittedOrder {
  orderNumber: string;
  /** Server-computed grand total (incl. tax & service charge). */
  total: number;
}

/**
 * Hook to manage order submission.
 *
 * The backend has no single atomic "add items + submit" endpoint, so lines that
 * were already added to the session are remembered (by line id + quantity) and
 * not re-sent on retry — a failed submit no longer duplicates dishes.
 */
export function useOrder(sessionCode: string | undefined, onSuccess?: (order: SubmittedOrder) => void) {
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('idle');
  const [order, setOrder] = useState<SubmittedOrder | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const addedLines = useRef(new Map<string, number>());
  const queryClient = useQueryClient();

  const submitOrderMutation = useMutation({
    mutationFn: async (items: CartItem[]): Promise<SubmittedOrder> => {
      if (!sessionCode) throw new Error('Sesi tidak ditemukan');

      for (const item of items) {
        const alreadyAdded = addedLines.current.get(item.lineId) ?? 0;
        const remaining = item.quantity - alreadyAdded;
        if (remaining <= 0) continue;
        await selfOrderApi.addItem(sessionCode, {
          productId: item.productId,
          variantId: item.variantId,
          quantity: remaining,
          notes: item.notes,
        });
        addedLines.current.set(item.lineId, item.quantity);
      }

      const totals = await selfOrderApi.getSessionTotal(sessionCode);
      const result = await selfOrderApi.submitSession(sessionCode);
      if (!result?.orderNumber) {
        throw new Error('Server tidak mengembalikan nomor pesanan');
      }
      return { orderNumber: result.orderNumber, total: totals.grandTotal };
    },
    onSuccess: (data) => {
      addedLines.current.clear();
      setOrder(data);
      setErrorMessage(null);
      setOrderStatus('success');
      queryClient.invalidateQueries({ queryKey: ['self-order-session', sessionCode] });
      onSuccess?.(data);
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : null);
      setOrderStatus('error');
    },
  });

  const submitOrder = useCallback(
    (cart: CartItem[], isOnline: boolean) => {
      if (!isOnline || cart.length === 0) {
        return false;
      }
      setOrderStatus('submitting');
      submitOrderMutation.mutate(cart);
      return true;
    },
    [submitOrderMutation]
  );

  return {
    orderStatus,
    order,
    errorMessage,
    submitOrder,
    isSubmitting: orderStatus === 'submitting',
    isSuccess: orderStatus === 'success',
    isError: orderStatus === 'error',
  };
}
