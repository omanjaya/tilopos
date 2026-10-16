import { useState } from 'react';
import type { CartItem } from '../types/storefront.types';

export function cartLineId(productId: string, variantId?: string): string {
  return `${productId}:${variantId ?? ''}`;
}

/**
 * Hook to manage shopping cart state and operations.
 * Lines are keyed by lineId (product + variant), so updating one line never
 * touches another.
 */
export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);

  const getItemTotal = (item: CartItem) => item.price * item.quantity;

  // Estimated from displayed prices; the authoritative total comes back from checkout.
  const cartTotal = cart.reduce((sum, item) => sum + getItemTotal(item), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addItem = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.lineId === item.lineId);
      if (existing) {
        return prev.map((c) =>
          c.lineId === item.lineId ? { ...c, quantity: c.quantity + item.quantity } : c,
        );
      }
      return [...prev, item];
    });
  };

  const updateQuantity = (lineId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.lineId === lineId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item,
      ),
    );
  };

  const removeItem = (lineId: string) => {
    setCart((prev) => prev.filter((item) => item.lineId !== lineId));
  };

  const clearCart = () => {
    setCart([]);
  };

  return {
    cart,
    cartTotal,
    cartItemCount,
    getItemTotal,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  };
}
