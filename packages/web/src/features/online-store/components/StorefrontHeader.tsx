import type { Storefront } from '@/types/online-store.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Instagram, Facebook, MessageCircle } from 'lucide-react';

interface StorefrontHeaderProps {
  storefront: Storefront;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  cartItemCount: number;
  onCartOpen: () => void;
}

export function StorefrontHeader({
  storefront,
  searchQuery,
  onSearchChange,
  cartItemCount,
  onCartOpen,
}: StorefrontHeaderProps) {
  return (
    <header className="bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Banner */}
        {storefront.banner && (
          <img
            src={storefront.banner}
            alt={storefront.name}
            className="w-full h-48 object-cover rounded-lg mb-4"
          />
        )}

        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="relative">
            <img
              src={storefront.logo || '/placeholder-store.png'}
              alt={storefront.name}
              className="h-20 w-20 rounded-full border-2"
              onError={(e) => { (e.currentTarget.src = '/placeholder-store.png'); }}
            />
          </div>

          {/* Store Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{storefront.name}</h1>
            {storefront.description && (
              <p className="text-muted-foreground">{storefront.description}</p>
            )}

            {/* Social Links */}
            <div className="flex gap-3 mt-2">
              {storefront.instagramUrl && (
                <a
                  href={storefront.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {storefront.facebookUrl && (
                <a
                  href={storefront.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {storefront.whatsappNumber && (
                <a
                  href={`https://wa.me/${storefront.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <MessageCircle className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>

          {/* Search & Cart */}
          <div className="flex items-center gap-4">
            <div className="w-64">
              <Input
                placeholder="Cari produk..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="lg"
              onClick={onCartOpen}
              className="relative"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="ml-2">Keranjang</span>
              {cartItemCount > 0 && (
                <Badge className="ml-2">{cartItemCount}</Badge>
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
