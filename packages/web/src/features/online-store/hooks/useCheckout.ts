import { useState } from 'react';
import { isAxiosError } from 'axios';
import { onlineStoreApi } from '@/api/endpoints/online-store.api';
import type { StorefrontOrderResult } from '@/types/online-store.types';
import type { CartItem, CustomerInfo, DeliveryMethod, OrderStatus, CheckoutStep } from '../types/storefront.types';

const initialCustomerInfo: CustomerInfo = {
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
};

function checkoutErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    const message = Array.isArray(data?.message) ? data?.message.join(', ') : data?.message;
    if (error.response?.status === 409) {
      return message ? `Stok tidak mencukupi: ${message}` : 'Stok tidak mencukupi untuk salah satu produk.';
    }
    if (message) return message;
  }
  return 'Pesanan gagal dibuat. Periksa koneksi Anda lalu coba lagi.';
}

/**
 * Hook to manage checkout flow state and order submission.
 * The confirmed order (server-computed totals) is kept after the cart is cleared.
 */
export function useCheckout(slug: string) {
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(0);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>(initialCustomerInfo);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('delivery');
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('idle');
  const [order, setOrder] = useState<StorefrontOrderResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submitOrder = async (cart: CartItem[], onSuccess?: () => void) => {
    if (cart.length === 0) return;
    if (orderStatus === 'submitting') return; // Prevent double-submit

    setOrderStatus('submitting');
    setErrorMessage(null);
    try {
      const result = await onlineStoreApi.createOrder(slug, {
        customerName: customerInfo.name.trim(),
        customerPhone: customerInfo.phone.trim(),
        customerEmail: customerInfo.email.trim() || undefined,
        shippingMethod: deliveryMethod,
        shippingAddress: deliveryMethod === 'delivery' ? customerInfo.address.trim() : undefined,
        notes: customerInfo.notes.trim() || undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      });

      setOrder(result);
      setOrderStatus('success');
      setCheckoutStep(0);
      onSuccess?.();
    } catch (error) {
      setErrorMessage(checkoutErrorMessage(error));
      setOrderStatus('error');
    }
  };

  const resetCheckout = () => {
    setCheckoutStep(0);
    setCustomerInfo(initialCustomerInfo);
    setDeliveryMethod('delivery');
    setOrderStatus('idle');
    setOrder(null);
    setErrorMessage(null);
  };

  return {
    checkoutStep,
    setCheckoutStep,
    customerInfo,
    setCustomerInfo,
    deliveryMethod,
    setDeliveryMethod,
    orderStatus,
    order,
    errorMessage,
    submitOrder,
    resetCheckout,
  };
}
