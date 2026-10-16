import { describe, it, expect } from 'vitest';
import { safeHttpsUrl, whatsappUrl } from './safe-links';
import { mapStorefront } from '@/api/endpoints/online-store.api';

describe('safe storefront links', () => {
  it('accepts only https URLs', () => {
    expect(safeHttpsUrl('https://instagram.com/toko')).toBe('https://instagram.com/toko');
    expect(safeHttpsUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpsUrl('http://example.com')).toBeNull();
    expect(safeHttpsUrl('not a url')).toBeNull();
    expect(safeHttpsUrl(undefined)).toBeNull();
  });

  it('builds wa.me links from digits only', () => {
    expect(whatsappUrl('+62 812-3456')).toBe('https://wa.me/628123456');
    expect(whatsappUrl('abc')).toBeNull();
  });
});

describe('mapStorefront', () => {
  it('maps backend StorefrontData to the UI shape', () => {
    const sf = mapStorefront({
      store: {
        id: 's1', storeName: 'Kopi', slug: 'kopi', description: null, logoUrl: 'l', bannerUrl: null,
        socialLinks: { instagram: 'https://ig.com/k', whatsapp: '0812' }, isDeliveryEnabled: true, isPickupEnabled: false,
      },
      categories: [{ id: 'c1', name: 'Minuman', imageUrl: null, productCount: 1 }],
      products: [{
        id: 'p1', name: 'Latte', description: null, basePrice: 25000, imageUrl: null, categoryId: 'c1',
        categoryName: 'Minuman', variants: [{ id: 'v1', name: 'Large', price: 30000 }], inStock: false,
      }],
    });
    expect(sf.name).toBe('Kopi');
    expect(sf.logo).toBe('l');
    expect(sf.socialLinks).toEqual({ instagram: 'https://ig.com/k', facebook: undefined, whatsapp: '0812' });
    expect(sf.products[0]).toMatchObject({ price: 25000, isAvailable: false, variants: [{ id: 'v1', price: 30000 }] });
  });
});
