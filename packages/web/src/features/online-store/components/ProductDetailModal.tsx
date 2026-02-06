import type { StorefrontProduct } from '@/types/online-store.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { clsx } from 'clsx';

interface ProductDetailModalProps {
  product: StorefrontProduct;
  quantity: number;
  setQuantity: (value: number) => void;
  selectedVariant: string;
  setSelectedVariant: (value: string) => void;
  selectedModifiers: string[];
  toggleModifier: (modifierId: string) => void;
  calculateTotal: (product: StorefrontProduct) => number;
  onAddToCart: () => void;
  onClose: () => void;
}

export function ProductDetailModal({
  product,
  quantity,
  setQuantity,
  selectedVariant,
  setSelectedVariant,
  selectedModifiers,
  toggleModifier,
  calculateTotal,
  onAddToCart,
  onClose,
}: ProductDetailModalProps) {
  const variants = product.variants || [];
  const modifierGroups = product.modifierGroups || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold">{product.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full rounded-lg object-cover max-h-64 mb-4"
          />
        )}

        {product.description && (
          <p className="text-gray-600 mb-4">{product.description}</p>
        )}

        <div className="mb-4">
          <span className="text-2xl font-bold">
            {formatCurrency(product.price)}
          </span>
        </div>

        {/* Variants */}
        {variants.length > 0 && (
          <div className="mb-4">
            <label className="block mb-2 font-medium">Pilih Varian</label>
            <div className="space-y-2">
              {variants.map((v) => (
                <label
                  key={v.id}
                  className={clsx(
                    'flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50',
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
                  {v.price !== product.price && (
                    <span className="text-sm text-muted-foreground">
                      ({v.price > product.price ? '+' : ''}{formatCurrency(v.price - product.price)})
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Modifiers */}
        {modifierGroups.map((group) => (
          <div key={group.id} className="mb-4">
            <label className="block mb-2 font-medium">{group.name}</label>
            <div className="space-y-2">
              {group.modifiers.map((modifier) => {
                const isSelected = selectedModifiers.includes(modifier.id);
                return (
                  <label
                    key={modifier.id}
                    className={clsx(
                      'flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50',
                      isSelected ? 'border-primary bg-primary/10' : ''
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleModifier(modifier.id)}
                      className="sr-only"
                    />
                    <span>{modifier.name}</span>
                    {modifier.price > 0 && (
                      <span className="text-sm text-muted-foreground">
                        (+{formatCurrency(modifier.price)})
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {/* Quantity */}
        <div className="mb-6">
          <label className="block mb-2 font-medium">Jumlah</label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              −
            </Button>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-20 text-center"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(quantity + 1)}
            >
              +
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          <Button onClick={onAddToCart} disabled={!product.isAvailable} className="flex-1">
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
      </div>
    </div>
  );
}
