import type { Storefront } from '@/types/online-store.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Instagram, Facebook, MessageCircle } from 'lucide-react';
import { safeHttpsUrl, whatsappUrl } from '../lib/safe-links';

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
  const instagram = safeHttpsUrl(storefront.socialLinks.instagram);
  const facebook = safeHttpsUrl(storefront.socialLinks.facebook);
  const whatsapp = whatsappUrl(storefront.socialLinks.whatsapp);

  return (
    <header className="bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {storefront.banner && (
          <img
            src={storefront.banner}
            alt={storefront.name}
            className="w-full h-48 object-cover rounded-lg mb-4"
          />
        )}

        <div className="flex items-center gap-6">
          <div className="relative">
            <img
              src={storefront.logo || '/placeholder-store.png'}
              alt={storefront.name}
              className="h-20 w-20 rounded-full border-2"
              onError={(e) => { (e.currentTarget.src = '/placeholder-store.png'); }}
            />
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold">{storefront.name}</h1>
            {storefront.description && (
              <p className="text-muted-foreground">{storefront.description}</p>
            )}

            <div className="flex gap-3 mt-2">
              {instagram && (
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {facebook && (
                <a
                  href={facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {whatsapp && (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <MessageCircle className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-64">
              <Input
                aria-label="Cari produk"
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
