import { useState } from 'react';
import type { StorefrontProduct } from '@/types/online-store.types';
import type { CartItem } from '../types/storefront.types';
import { cartLineId } from './useCart';

/**
 * Hook to manage product/variant selection. Products with variants require a
 * variant (the first one is preselected) because the server prices by variant.
 */
export function useProductSelection() {
  const [selectedProduct, setSelectedProduct] = useState<StorefrontProduct | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  const unitPrice = (product: StorefrontProduct) => {
    const variant = product.variants.find((v) => v.id === selectedVariant);
    return variant ? variant.price : product.price;
  };

  const calculateTotal = (product: StorefrontProduct) => unitPrice(product) * quantity;

  const canAddToCart = (product: StorefrontProduct) =>
    product.isAvailable &&
    (product.variants.length === 0 || product.variants.some((v) => v.id === selectedVariant));

  const toCartItem = (product: StorefrontProduct): CartItem => {
    const variant = product.variants.find((v) => v.id === selectedVariant);
    return {
      lineId: cartLineId(product.id, variant?.id),
      productId: product.id,
      variantId: variant?.id,
      name: product.name,
      variantName: variant?.name,
      price: unitPrice(product),
      quantity,
      imageUrl: product.imageUrl,
    };
  };

  const resetSelection = () => {
    setSelectedProduct(null);
    setSelectedVariant('');
    setQuantity(1);
  };

  const selectProduct = (product: StorefrontProduct) => {
    setSelectedProduct(product);
    setQuantity(1);
    setSelectedVariant(product.variants[0]?.id ?? '');
  };

  return {
    selectedProduct,
    selectedVariant,
    quantity,
    setQuantity,
    setSelectedVariant,
    calculateTotal,
    canAddToCart,
    toCartItem,
    resetSelection,
    selectProduct,
  };
}
