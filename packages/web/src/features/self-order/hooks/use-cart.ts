import { useState, useCallback, useMemo } from 'react';
import type { SelfOrderMenuItem, SelfOrderMenuVariant } from '@/types/self-order.types';

export interface CartItem {
  /** Stable line id: productId + variantId. */
  lineId: string;
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  /** Display price (variant price when a variant is chosen). */
  price: number;
  quantity: number;
  notes?: string;
  imageUrl?: string | null;
}

export function cartLineId(productId: string, variantId?: string): string {
  return `${productId}:${variantId ?? ''}`;
}

/** Products with variants must be added with a specific variant (server prices by variant). */
export function requiresVariant(product: SelfOrderMenuItem): boolean {
  return (product.variants?.length ?? 0) > 0;
}

/**
 * Hook to manage shopping cart state and operations
 * @returns Cart state and manipulation functions
 */
export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Estimated totals from displayed prices; the authoritative total comes from the server on submit.
  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const cartItemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  // Add item to cart. Returns false when the product needs a variant but none was given.
  const addToCart = useCallback(
    (
      product: SelfOrderMenuItem,
      quantity: number = 1,
      notes?: string,
      variant?: SelfOrderMenuVariant,
    ): boolean => {
      if (requiresVariant(product) && !variant) return false;
      const lineId = cartLineId(product.id, variant?.id);
      setCart((prev) => {
        const existing = prev.find((item) => item.lineId === lineId);
        if (existing) {
          return prev.map((item) =>
            item.lineId === lineId
              ? { ...item, quantity: item.quantity + quantity, notes: notes || item.notes }
              : item
          );
        }
        return [
          ...prev,
          {
            lineId,
            productId: product.id,
            variantId: variant?.id,
            name: product.name,
            variantName: variant?.name,
            price: variant ? variant.price : product.price,
            quantity,
            notes,
            imageUrl: product.imageUrl,
          },
        ];
      });
      return true;
    },
    [],
  );

  // Update item quantity
  const updateQuantity = useCallback((lineId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.lineId === lineId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  // Remove item from cart
  const removeFromCart = useCallback((lineId: string) => {
    setCart((prev) => prev.filter((item) => item.lineId !== lineId));
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
