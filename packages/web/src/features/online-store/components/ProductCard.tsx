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
  const lowestVariantPrice =
    product.variants.length > 0 ? Math.min(...product.variants.map((v) => v.price)) : null;

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition">
      <div className="relative aspect-square">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gray-100 flex items-center justify-center text-gray-300" aria-hidden="true">
            🍽️
          </div>
        )}

        {!product.isAvailable && (
          <Badge className="absolute top-2 right-2" variant="secondary">
            Stok Habis
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
          <span className="text-lg font-bold">
            {lowestVariantPrice !== null && (
              <span className="mr-1 text-xs font-normal text-muted-foreground">mulai</span>
            )}
            {formatCurrency(lowestVariantPrice ?? product.price)}
          </span>

          <Button
            size="sm"
            disabled={!product.isAvailable}
            onClick={onAddToCart}
            aria-label={`Pilih ${product.name}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
