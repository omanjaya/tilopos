/** Admin view of an online store (GET /online-store/stores, mapped from Prisma OnlineStore). */
export interface OnlineStore {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** POST /online-store/stores — businessId comes from the JWT, never the body. */
export interface CreateOnlineStoreRequest {
  name: string;
  slug: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Public storefront — UI shape. onlineStoreApi.getStorefront maps the backend
// StorefrontData ({ store: { storeName, logoUrl, bannerUrl, socialLinks },
// products: [{ basePrice, inStock }] }) to these types.
// The storefront has no modifiers and no tax: the server prices orders from
// product/variant prices only (online-store.service.ts createStorefrontOrder).
// ---------------------------------------------------------------------------

export interface StorefrontSocialLinks {
  instagram?: string;
  facebook?: string;
  whatsapp?: string;
}

export interface Storefront {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  banner: string | null;
  socialLinks: StorefrontSocialLinks;
  isDeliveryEnabled: boolean;
  isPickupEnabled: boolean;
  categories: StorefrontCategory[];
  products: StorefrontProduct[];
}

export interface StorefrontCategory {
  id: string;
  name: string;
  imageUrl: string | null;
  productCount: number;
}

export interface StorefrontProductVariant {
  id: string;
  name: string;
  price: number;
}

export interface StorefrontProduct {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  isAvailable: boolean;
  categoryId: string | null;
  categoryName: string | null;
  variants: StorefrontProductVariant[];
}

/** Backend StorefrontOrderInput (interfaces/storefront.interface.ts). */
export interface CreateStorefrontOrderRequest {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress?: string;
  shippingMethod?: 'delivery' | 'pickup';
  notes?: string;
  items: { productId: string; variantId?: string; quantity: number }[];
}

/** Backend StorefrontOrderResult. */
export interface StorefrontOrderResult {
  orderId: string;
  orderNumber: string;
  subtotal: number;
  shippingCost: number;
  grandTotal: number;
  status: string;
  createdAt: string;
}
