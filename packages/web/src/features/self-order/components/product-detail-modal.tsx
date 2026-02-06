import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/format';
import type { SelfOrderMenuItem } from '@/types/self-order.types';

interface ProductDetailModalProps {
  product: SelfOrderMenuItem | null;
  open: boolean;
  onClose: () => void;
  onAddToCart: (product: SelfOrderMenuItem) => void;
  onImageClick?: (imageUrl: string) => void;
}

/**
 * Modal for displaying product details
 * Shows image, description, price, and add to cart button
 */
export function ProductDetailModal({
  product,
  open,
  onClose,
  onAddToCart,
  onImageClick,
}: ProductDetailModalProps) {
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {product.imageUrl && (
            <div
              className="relative cursor-pointer rounded-lg overflow-hidden"
              onClick={() => onImageClick?.(product.imageUrl!)}
            >
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full rounded-lg object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 hover:opacity-100 transition-opacity">
                <p className="text-white text-sm font-medium">Klik untuk perbesar</p>
              </div>
            </div>
          )}
          {product.description && <p className="text-gray-600">{product.description}</p>}
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(product.price)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onAddToCart(product)}>
              Tambah ke Keranjang
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
