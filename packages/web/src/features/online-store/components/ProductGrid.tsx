import { useState } from 'react';
import type { StorefrontProduct, StorefrontCategory } from '@/types/online-store.types';
import { ProductCard } from './ProductCard';
import { clsx } from 'clsx';

interface ProductGridProps {
  products: StorefrontProduct[];
  categories: StorefrontCategory[];
  searchQuery: string;
  onProductSelect: (product: StorefrontProduct) => void;
}

export function ProductGrid({ products, categories, searchQuery, onProductSelect }: ProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Categories with "all" option
  const allCategories = [
    { id: 'all', name: 'Semua', slug: 'all' },
    ...categories,
  ];

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Category Sidebar */}
      <aside className="col-span-3 hidden md:block">
        <div className="bg-white rounded-lg shadow p-4 sticky top-24">
          <h3 className="font-semibold mb-3">Kategori</h3>
          <nav className="space-y-1">
            {allCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={clsx(
                  'w-full text-left px-3 py-2 rounded-md transition-colors',
                  selectedCategory === cat.id
                    ? 'bg-primary text-white'
                    : 'hover:bg-gray-100'
                )}
              >
                {cat.name} ({cat.id === 'all' ? products.length : products.filter(p => p.categoryId === cat.id).length})
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Product Grid */}
      <main className="col-span-12 md:col-span-9">
        {/* Products */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={() => onProductSelect(product)}
            />
          ))}
        </div>

        {/* Empty state */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Tidak ada produk yang ditemukan</p>
          </div>
        )}
      </main>
    </div>
  );
}
