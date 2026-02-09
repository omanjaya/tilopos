import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useDynamicPricing } from '@/hooks/useDynamicPricing';
import { Tag, TrendingDown } from 'lucide-react';

export interface ProductCardWithDynamicPriceProps {
  productId: string;
  categoryId?: string;
  name: string;
  imageUrl?: string;
  originalPrice: number;
  quantity?: number;
  customerSegment?: string;
  stockLevel?: number;
  cartTotal?: number;
  cartItemCount?: number;
  onAddToCart?: () => void;
  className?: string;
}

export function ProductCardWithDynamicPrice({
  productId,
  categoryId,
  name,
  imageUrl,
  originalPrice,
  quantity = 1,
  customerSegment,
  stockLevel,
  cartTotal,
  cartItemCount,
  onAddToCart,
  className,
}: ProductCardWithDynamicPriceProps) {
  const { finalPrice, discount, hasDiscount, savingsPercentage, appliedRules, isLoading } =
    useDynamicPricing({
      productId,
      categoryId,
      quantity,
      originalPrice,
      customerSegment,
      stockLevel,
      cartTotal,
      cartItemCount,
    });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Card
      className={`relative overflow-hidden transition-all hover:shadow-lg ${className}`}
      onClick={onAddToCart}
    >
      {/* Product Image */}
      {imageUrl && (
        <div className="relative h-48 w-full overflow-hidden bg-gray-100">
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform hover:scale-105"
          />
          {hasDiscount && (
            <div className="absolute right-2 top-2">
              <Badge variant="destructive" className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                {savingsPercentage.toFixed(0)}% OFF
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Product Info */}
      <div className="p-4">
        <h3 className="mb-2 font-semibold text-gray-900">{name}</h3>

        {/* Pricing */}
        <div className="space-y-1">
          {isLoading ? (
            <div className="h-6 w-24 animate-pulse rounded bg-gray-200" />
          ) : hasDiscount ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-green-600">
                  {formatPrice(finalPrice)}
                </span>
                <span className="text-sm text-gray-500 line-through">
                  {formatPrice(originalPrice)}
                </span>
              </div>
              <p className="text-xs text-green-600">
                Hemat {formatPrice(discount)}
              </p>
            </>
          ) : (
            <span className="text-xl font-bold text-gray-900">
              {formatPrice(originalPrice)}
            </span>
          )}
        </div>

        {/* Applied Rules */}
        {appliedRules.length > 0 && (
          <div className="mt-3 space-y-1">
            {appliedRules.slice(0, 2).map((rule) => (
              <div
                key={rule.ruleId}
                className="flex items-center gap-1 text-xs text-gray-600"
              >
                <Tag className="h-3 w-3" />
                <span>{rule.ruleName}</span>
              </div>
            ))}
            {appliedRules.length > 2 && (
              <p className="text-xs text-gray-500">
                +{appliedRules.length - 2} promo lainnya
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
