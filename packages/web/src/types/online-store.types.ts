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

export interface CreateOnlineStoreRequest {
  businessId: string;
  name: string;
  slug: string;
  description?: string;
}

// Storefront types
export interface Storefront {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  banner: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  whatsappNumber: string | null;
  currency: string;
  categories: StorefrontCategory[];
  products: StorefrontProduct[];
}

export interface StorefrontCategory {
  id: string;
  name: string;
  slug: string;
}

export interface StorefrontProduct {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  compareAtPrice: number | null;
  isAvailable: boolean;
  categoryId: string;
  variants: StorefrontProductVariant[];
  modifierGroups: StorefrontModifierGroup[];
}

export interface StorefrontProductVariant {
  id: string;
  name: string;
  price: number;
  sku: string | null;
  isAvailable: boolean;
  stock: number | null;
}

export interface StorefrontModifierGroup {
  id: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  modifiers: StorefrontModifier[];
}

export interface StorefrontModifier {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface StorefrontCartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  modifiers: { modifierId: string }[];
  notes?: string;
}

export interface CreateStorefrontOrderRequest {
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  deliveryAddress?: string;
  items: StorefrontCartItem[];
  notes?: string;
}

export interface StorefrontOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
}
