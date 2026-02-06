import { useState } from 'react';
import type { StorefrontProduct } from '@/types/online-store.types';
import type { CartItem } from '../types/storefront.types';

/**
 * Hook to manage product/variant/modifier selection logic
 */
export function useProductSelection() {
  const [selectedProduct, setSelectedProduct] = useState<StorefrontProduct | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  // Toggle modifier selection
  const toggleModifier = (modifierId: string) => {
    setSelectedModifiers((prev) =>
      prev.includes(modifierId)
        ? prev.filter((id) => id !== modifierId)
        : [...prev, modifierId]
    );
  };

  // Calculate total for current selection
  const calculateTotal = (product: StorefrontProduct) => {
    const variant = product.variants?.find((v) => v.id === selectedVariant);
    const basePrice = variant?.price || product.price;

    const modifiersPrice = selectedModifiers.reduce((sum, modId) => {
      const modifier = product.modifierGroups
        ?.flatMap((g) => g.modifiers)
        .find((m) => m.id === modId);
      return sum + (modifier?.price || 0);
    }, 0);

    return (basePrice + modifiersPrice) * quantity;
  };

  // Convert selection to cart item
  const toCartItem = (product: StorefrontProduct): CartItem => {
    const variant = product.variants?.find((v) => v.id === selectedVariant);
    const modifiers = selectedModifiers
      .map((id) =>
        product.modifierGroups
          ?.flatMap((g) => g.modifiers)
          .find((m) => m.id === id)
      )
      .filter((m): m is { id: string; name: string; price: number; isAvailable: boolean } => m !== undefined);

    return {
      productId: product.id,
      variantId: variant?.id,
      name: product.name,
      price: product.price,
      quantity,
      imageUrl: product.imageUrl,
      variant,
      modifiers,
    };
  };

  // Reset selection
  const resetSelection = () => {
    setSelectedProduct(null);
    setSelectedVariant('');
    setSelectedModifiers([]);
    setQuantity(1);
  };

  // Open product for selection
  const selectProduct = (product: StorefrontProduct) => {
    setSelectedProduct(product);
    setQuantity(1);
    setSelectedVariant('');
    setSelectedModifiers([]);
  };

  return {
    selectedProduct,
    selectedVariant,
    selectedModifiers,
    quantity,
    setQuantity,
    setSelectedVariant,
    toggleModifier,
    calculateTotal,
    toCartItem,
    resetSelection,
    selectProduct,
  };
}
