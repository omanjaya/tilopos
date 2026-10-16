import type { StorefrontProduct } from '@/types/online-store.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { clsx } from 'clsx';

interface ProductDetailModalProps {
  product: StorefrontProduct;
  quantity: number;
  setQuantity: (value: number) => void;
  selectedVariant: string;
  setSelectedVariant: (value: string) => void;
  calculateTotal: (product: StorefrontProduct) => number;
  canAddToCart: boolean;
  onAddToCart: () => void;
  onClose: () => void;
}

export function ProductDetailModal({
  product,
  quantity,
  setQuantity,
  selectedVariant,
  setSelectedVariant,
  calculateTotal,
  canAddToCart,
  onAddToCart,
  onClose,
}: ProductDetailModalProps) {
  const variants = product.variants;
  const selected = variants.find((v) => v.id === selectedVariant);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{product.name}</DialogTitle>
          <DialogDescription className="sr-only">Detail produk {product.name}</DialogDescription>
        </DialogHeader>

        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full rounded-lg object-cover max-h-64"
          />
        )}

        {product.description && <p className="text-gray-600">{product.description}</p>}

        <div>
          <span className="text-2xl font-bold">
            {formatCurrency(selected ? selected.price : product.price)}
          </span>
        </div>

        {variants.length > 0 && (
          <fieldset>
            <legend className="block mb-2 font-medium">Pilih Varian *</legend>
            <div className="space-y-2">
              {variants.map((v) => (
                <label
                  key={v.id}
                  className={clsx(
                    'flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-ring',
                    selectedVariant === v.id ? 'border-primary bg-primary/10' : ''
                  )}
                >
                  <input
                    type="radio"
                    name="variant"
                    checked={selectedVariant === v.id}
                    onChange={() => setSelectedVariant(v.id)}
                    className="sr-only"
                  />
                  <span>{v.name}</span>
                  <span className="text-sm text-muted-foreground">{formatCurrency(v.price)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div>
          <label htmlFor="storefront-qty" className="block mb-2 font-medium">Jumlah</label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              aria-label="Kurangi jumlah"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              id="storefront-qty"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-20 text-center"
            />
            <Button
              variant="outline"
              size="icon"
              aria-label="Tambah jumlah"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          <Button onClick={onAddToCart} disabled={!canAddToCart} className="flex-1">
            {product.isAvailable ? (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Tambah ke Keranjang - {formatCurrency(calculateTotal(product))}
              </>
            ) : (
              'Stok Habis'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
