export interface OnlineStoreRecord {
  id: string;
  businessId: string;
  storeName: string;
  slug: string;
  domain: string | null;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  themeSettings: unknown;
  shippingMethods: unknown;
  paymentMethods: unknown;
  socialLinks: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreOrderRecord {
  id: string;
  storeId: string;
  outletId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  shippingAddress: string | null;
  shippingMethod: string | null;
  shippingCost: number;
  subtotal: number;
  discountAmount: number;
  grandTotal: number;
  paymentMethod: string | null;
  paymentStatus: string;
  orderStatus: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreProductRecord {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  categoryId: string | null;
  isActive: boolean;
}

export interface IOnlineStoreRepository {
  findStoresByBusinessId(businessId: string): Promise<OnlineStoreRecord[]>;
  createStore(data: {
    businessId: string;
    storeName: string;
    slug: string;
    description: string | null;
  }): Promise<OnlineStoreRecord>;
  findStoreBySlug(slug: string): Promise<OnlineStoreRecord | null>;
  findActiveProductsByBusinessId(businessId: string): Promise<StoreProductRecord[]>;
  findStoreOrders(storeId: string, status?: string): Promise<StoreOrderRecord[]>;
  createStoreOrder(data: {
    storeId: string;
    outletId: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    shippingAddress: string | null;
    subtotal: number;
    grandTotal: number;
    items: {
      productId: string;
      variantId: string | null;
      productName: string;
      variantName: string | null;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[];
  }): Promise<StoreOrderRecord>;
  updateOrderStatus(id: string, status: string): Promise<StoreOrderRecord>;
}
