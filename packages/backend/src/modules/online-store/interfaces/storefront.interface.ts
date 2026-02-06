/**
 * Storefront Public API Interfaces
 *
 * Interfaces for public-facing storefront data (products, orders).
 */

export interface StorefrontData {
  store: {
    id: string;
    storeName: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    socialLinks: unknown;
    isDeliveryEnabled: boolean;
    isPickupEnabled: boolean;
  };
  categories: {
    id: string;
    name: string;
    imageUrl: string | null;
    productCount: number;
  }[];
  products: {
    id: string;
    name: string;
    description: string | null;
    basePrice: number;
    imageUrl: string | null;
    categoryId: string | null;
    categoryName: string | null;
    variants: { id: string; name: string; price: number }[];
    inStock: boolean;
  }[];
}

export interface StorefrontProductDetail {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  variants: { id: string; name: string; sku: string | null; price: number }[];
  modifierGroups: {
    id: string;
    name: string;
    isRequired: boolean;
    selectionType: string;
    minSelection: number;
    maxSelection: number | null;
    modifiers: { id: string; name: string; price: number }[];
  }[];
  inStock: boolean;
  totalStock: number | null;
}

export interface StorefrontOrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress?: string;
  shippingMethod?: string;
  notes?: string;
  items: {
    productId: string;
    variantId?: string;
    quantity: number;
  }[];
}

export interface StorefrontOrderResult {
  orderId: string;
  orderNumber: string;
  subtotal: number;
  shippingCost: number;
  grandTotal: number;
  status: string;
  createdAt: Date;
}
