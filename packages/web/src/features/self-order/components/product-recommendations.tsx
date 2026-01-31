import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { selfOrderApi } from '@/api/endpoints/self-order.api';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import type { SelfOrderMenuItem } from '@/types/self-order.types';

interface ProductRecommendationsProps {
  outletId: string;
  currentProductId?: string;
  onAddToCart: (product: SelfOrderMenuItem) => void;
  maxItems?: number;
}

export function ProductRecommendations({
  outletId,
  currentProductId,
  onAddToCart,
  maxItems = 4,
}: ProductRecommendationsProps) {
  const [showAll, setShowAll] = useState(false);

  const { data: menuItems, isLoading } = useQuery({
    queryKey: ['self-order-menu', outletId],
    queryFn: () => selfOrderApi.getMenu(outletId),
    enabled: !!outletId,
  });

  // Get popular items (simulate by sorting - in real app, this would come from API)
  const popularItems = menuItems
    ?.filter((item) => item.id !== currentProductId && item.isAvailable)
    .sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0))
    .slice(0, showAll ? undefined : maxItems) || [];

  if (isLoading) {
    return (
      <section className="mb-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold">Menu Populer</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: maxItems }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </section>
    );
  }

  if (popularItems.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold">Menu Populer</h2>
        </div>
        {!showAll && popularItems.length > maxItems && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(true)}
            className="text-primary"
          >
            Lihat Semua
          </Button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {popularItems.map((item) => (
          <Card
            key={item.id}
            className={clsx(
              'overflow-hidden transition-shadow hover:shadow-lg',
              !item.isAvailable && 'opacity-50'
            )}
          >
            <div className="aspect-square w-full overflow-hidden bg-gray-100">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-300">
                  🍽️
                </div>
              )}
            </div>
            <CardContent className="p-3">
              <h3 className="font-medium text-sm line-clamp-1">{item.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{item.categoryName}</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="font-semibold text-sm">{formatCurrency(item.price)}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  onClick={() => onAddToCart(item)}
                  disabled={!item.isAvailable}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
