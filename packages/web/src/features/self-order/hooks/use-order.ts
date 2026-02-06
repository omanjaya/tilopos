import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { selfOrderApi } from '@/api/endpoints/self-order.api';
import type { CartItem } from './use-cart';

interface OrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
  notes?: string;
}

type OrderStatus = 'idle' | 'submitting' | 'success' | 'error';

/**
 * Hook to manage order submission
 * @param sessionCode - The session code for the order
 * @param onSuccess - Callback when order is submitted successfully
 * @returns Order state and submission function
 */
export function useOrder(sessionCode: string | undefined, onSuccess?: (orderNumber: string) => void) {
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('idle');
  const [orderNumber, setOrderNumber] = useState('');
  const queryClient = useQueryClient();

  // Submit order mutation
  const submitOrderMutation = useMutation({
    mutationFn: async (items: OrderItem[]) => {
      if (!sessionCode) throw new Error('No session code');

      // Add items to session
      for (const item of items) {
        await selfOrderApi.addItem(sessionCode, item);
      }

      // Submit session
      const result = await selfOrderApi.submitSession(sessionCode);
      return result;
    },
    onSuccess: (data) => {
      const orderNum = data.orderNumber || `ORD-${Date.now()}`;
      setOrderNumber(orderNum);
      setOrderStatus('success');
      queryClient.invalidateQueries({ queryKey: ['self-order-session', sessionCode] });
      onSuccess?.(orderNum);
    },
    onError: () => {
      setOrderStatus('error');
    },
  });

  // Submit order handler
  const submitOrder = useCallback(
    (cart: CartItem[], isOnline: boolean) => {
      if (!isOnline || cart.length === 0) {
        return false;
      }

      setOrderStatus('submitting');
      const orderItems: OrderItem[] = cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes,
      }));

      submitOrderMutation.mutate(orderItems);
      return true;
    },
    [submitOrderMutation]
  );

  // Reset order state
  const resetOrder = useCallback(() => {
    setOrderStatus('idle');
    setOrderNumber('');
  }, []);

  return {
    orderStatus,
    orderNumber,
    submitOrder,
    resetOrder,
    isSubmitting: orderStatus === 'submitting',
    isSuccess: orderStatus === 'success',
    isError: orderStatus === 'error',
  };
}
