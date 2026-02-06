import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Menu, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import type { SelfOrderMenuItem } from '@/types/self-order.types';

interface MenuGridProps {
  items: SelfOrderMenuItem[];
  onProductClick: (product: SelfOrderMenuItem) => void;
  onAddToCart: (product: SelfOrderMenuItem) => void;
}

/**
 * Grid display for menu items
 * Shows product cards with image, name, price, and quick add button
 */
export function MenuGrid({ items, onProductClick, onAddToCart }: MenuGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Menu className="mx-auto h-16 w-16 text-gray-400" />
          <p className="mt-4 text-gray-600">Tidak ada menu yang ditemukan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card
          key={item.id}
          className="cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
          onClick={() => onProductClick(item)}
        >
          <div className="aspect-video w-full overflow-hidden bg-gray-100 relative group">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Menu className="h-16 w-16 text-gray-300" />
              </div>
            )}
          </div>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900">{item.name}</h3>
                <p className="mt-1 text-sm text-gray-600">{item.categoryName}</p>
              </div>
            </div>
            {item.description && (
              <p className="mt-2 line-clamp-2 text-sm text-gray-600">{item.description}</p>
            )}
            <div className="mt-3 flex items-center justify-between">
              <p className="text-lg font-bold text-gray-900">{formatCurrency(item.price)}</p>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(item);
                }}
                className="min-h-[44px] min-w-[44px]"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
