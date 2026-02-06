import type { StorefrontProduct } from '@/types/online-store.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface ProductCardProps {
  product: StorefrontProduct;
  onAddToCart: () => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercent = hasDiscount && product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition cursor-pointer">
      <div className="relative aspect-square">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gray-100 flex items-center justify-center text-gray-300">
            🍽️
          </div>
        )}

        {/* Badges */}
        {!product.isAvailable && (
          <Badge className="absolute top-2 right-2" variant="secondary">
            Stok Habis
          </Badge>
        )}
        {hasDiscount && (
          <Badge className="absolute top-2 left-2" variant="destructive">
            Sale {discountPercent}%
          </Badge>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-medium mb-1">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div>
            {hasDiscount ? (
              <>
                <span className="text-lg font-bold text-destructive">
                  {formatCurrency(product.price)}
                </span>
                <span className="text-sm text-muted-foreground line-through ml-2">
                  {formatCurrency(product.compareAtPrice)}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold">{formatCurrency(product.price)}</span>
            )}
          </div>

          <Button
            size="sm"
            disabled={!product.isAvailable}
            onClick={onAddToCart}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
