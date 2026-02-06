import { useState, useCallback } from 'react';
import type { SelfOrderMenuItem } from '@/types/self-order.types';

/**
 * Hook to manage product detail modal and lightbox
 * @returns Product detail state and handlers
 */
export function useProductDetail() {
  const [selectedProduct, setSelectedProduct] = useState<SelfOrderMenuItem | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Open product detail modal
  const openProductDetail = useCallback((product: SelfOrderMenuItem) => {
    setSelectedProduct(product);
  }, []);

  // Close product detail modal
  const closeProductDetail = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  // Open lightbox for image viewing
  const openLightbox = useCallback((images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  return {
    selectedProduct,
    openProductDetail,
    closeProductDetail,
    lightboxOpen,
    setLightboxOpen,
    lightboxImages,
    lightboxIndex,
    openLightbox,
  };
}
