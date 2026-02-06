import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShoppingCart } from 'lucide-react';
import { clsx } from 'clsx';

interface MenuHeaderProps {
  sessionCode?: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  cartItemCount: number;
  onOpenCart: () => void;
}

/**
 * Header component for self-order menu page
 * Displays session info, search, categories, and cart button
 */
export function MenuHeader({
  sessionCode,
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
  cartItemCount,
  onOpenCart,
}: MenuHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Menu</h1>
            <p className="text-sm text-gray-600">Sesi: {sessionCode || '-'}</p>
          </div>
          <Button onClick={onOpenCart} className="relative gap-2" size="lg">
            <ShoppingCart className="h-5 w-5" />
            <span>Keranjang</span>
            {cartItemCount > 0 && (
              <Badge className="absolute -right-2 -top-2 h-6 w-6 rounded-full p-0 text-center">
                {cartItemCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Search */}
        <div className="mt-4">
          <Input
            placeholder="Cari menu..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Categories */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={clsx(
                'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                selectedCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {category === 'all' ? 'Semua' : category}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
