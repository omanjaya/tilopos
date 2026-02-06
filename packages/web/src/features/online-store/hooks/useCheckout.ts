import { useState } from 'react';
import { onlineStoreApi } from '@/api/endpoints/online-store.api';
import type { CartItem, CustomerInfo, DeliveryMethod, OrderStatus, CheckoutStep } from '../types/storefront.types';

const initialCustomerInfo: CustomerInfo = {
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
};

/**
 * Hook to manage checkout flow state and order submission
 */
export function useCheckout(slug: string) {
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(0);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>(initialCustomerInfo);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('delivery');
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('idle');
  const [orderNumber, setOrderNumber] = useState('');

  // Submit order
  const submitOrder = async (cart: CartItem[], onSuccess?: () => void) => {
    if (cart.length === 0) return;

    setOrderStatus('submitting');
    try {
      const result = await onlineStoreApi.createOrder(slug, {
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerEmail: customerInfo.email || undefined,
        deliveryAddress: deliveryMethod === 'delivery' ? customerInfo.address : undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          modifiers: item.modifiers?.map((m) => ({ modifierId: m.id })) || [],
          notes: customerInfo.notes,
        })),
        notes: customerInfo.notes,
      });

      setOrderNumber(result.orderNumber);
      setOrderStatus('success');
      setCheckoutStep(0);

      if (onSuccess) {
        onSuccess();
      }
    } catch {
      setOrderStatus('error');
    }
  };

  // Reset checkout state
  const resetCheckout = () => {
    setCheckoutStep(0);
    setCustomerInfo(initialCustomerInfo);
    setDeliveryMethod('delivery');
    setOrderStatus('idle');
    setOrderNumber('');
  };

  return {
    checkoutStep,
    setCheckoutStep,
    customerInfo,
    setCustomerInfo,
    deliveryMethod,
    setDeliveryMethod,
    orderStatus,
    setOrderStatus,
    orderNumber,
    submitOrder,
    resetCheckout,
  };
}
