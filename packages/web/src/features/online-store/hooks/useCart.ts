import { useState } from 'react';
import type { CartItem } from '../types/storefront.types';

/**
 * Hook to manage shopping cart state and operations
 */
export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Calculate item total
  const getItemTotal = (item: CartItem) => {
    const basePrice = item.variant?.price || item.price;
    const modifiersPrice = item.modifiers?.reduce((sum, m) => sum + m.price, 0) || 0;
    return (basePrice + modifiersPrice) * item.quantity;
  };

  // Cart calculations
  const cartTotal = cart.reduce((sum, item) => sum + getItemTotal(item), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Add item to cart
  const addItem = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find(
        (cartItem) =>
          cartItem.productId === item.productId &&
          cartItem.variantId === item.variantId &&
          JSON.stringify(cartItem.modifiers?.map((m) => m?.id) || []) ===
          JSON.stringify(item.modifiers?.map((m) => m?.id) || [])
      );

      if (existing) {
        return prev.map((cartItem) =>
          cartItem.productId === item.productId &&
          cartItem.variantId === item.variantId &&
          JSON.stringify(cartItem.modifiers?.map((m) => m?.id) || []) ===
          JSON.stringify(item.modifiers?.map((m) => m?.id) || [])
            ? { ...cartItem, quantity: cartItem.quantity + item.quantity }
            : cartItem
        );
      }

      return [...prev, item];
    });
  };

  // Update quantity
  const updateQuantity = (productId: string, variantId: string | undefined, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId && item.variantId === variantId
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // Remove from cart
  const removeItem = (productId: string, variantId: string | undefined) => {
    setCart((prev) => prev.filter((item) => !(item.productId === productId && item.variantId === variantId)));
  };

  // Clear cart
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
