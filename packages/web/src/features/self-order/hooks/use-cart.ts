import { useState, useCallback, useMemo } from 'react';
import type { SelfOrderMenuItem } from '@/types/self-order.types';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  imageUrl?: string | null;
}

/**
 * Hook to manage shopping cart state and operations
 * @returns Cart state and manipulation functions
 */
export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Calculate cart totals
  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const cartItemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  // Add item to cart
  const addToCart = useCallback((product: SelfOrderMenuItem, quantity: number = 1, notes?: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity, notes: notes || item.notes }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity,
          notes,
          imageUrl: product.imageUrl,
        },
      ];
    });
  }, []);

  // Update item quantity
  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  // Remove item from cart
  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  // Clear entire cart
  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  return {
    cart,
    cartTotal,
    cartItemCount,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  };
}
