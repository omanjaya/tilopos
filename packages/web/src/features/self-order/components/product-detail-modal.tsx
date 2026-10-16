import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/format';
import { clsx } from 'clsx';
import type { SelfOrderMenuItem, SelfOrderMenuVariant } from '@/types/self-order.types';

interface ProductDetailModalProps {
  product: SelfOrderMenuItem | null;
  open: boolean;
  onClose: () => void;
  onAddToCart: (product: SelfOrderMenuItem, variant?: SelfOrderMenuVariant) => void;
  onImageClick?: (imageUrl: string) => void;
}

/**
 * Modal for displaying product details.
 * Products with variants require a variant choice (the server prices by variant).
 */
export function ProductDetailModal({
  product,
  open,
  onClose,
  onAddToCart,
  onImageClick,
}: ProductDetailModalProps) {
  const [variantId, setVariantId] = useState<string | undefined>(undefined);

  // Preselect the first variant whenever a new product opens.
  useEffect(() => {
    setVariantId(product?.variants?.[0]?.id);
  }, [product]);

  if (!product) return null;

  const variants = product.variants ?? [];
  const selectedVariant = variants.find((v) => v.id === variantId);
  const price = selectedVariant ? selectedVariant.price : product.price;
  const canAdd = variants.length === 0 || !!selectedVariant;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{product.name}</DialogTitle>
          <DialogDescription className="sr-only">Detail produk {product.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {product.imageUrl && (
            <button
              type="button"
              aria-label={`Perbesar gambar ${product.name}`}
              className="relative block w-full cursor-pointer rounded-lg overflow-hidden"
              onClick={() => onImageClick?.(product.imageUrl!)}
            >
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full rounded-lg object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-white text-sm font-medium">Klik untuk perbesar</span>
              </span>
            </button>
          )}
          {product.description && <p className="text-gray-600">{product.description}</p>}

          {variants.length > 0 && (
            <div role="radiogroup" aria-label="Pilih varian" className="space-y-2">
              <p className="text-sm font-medium">Pilih varian</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    role="radio"
                    aria-checked={v.id === variantId}
                    onClick={() => setVariantId(v.id)}
                    className={clsx(
                      'rounded-full border px-3 py-1.5 text-sm',
                      v.id === variantId
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
                    )}
                  >
                    {v.name} · {formatCurrency(v.price)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(price)}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={!canAdd}
              onClick={() => onAddToCart(product, selectedVariant)}
            >
              Tambah ke Keranjang
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
