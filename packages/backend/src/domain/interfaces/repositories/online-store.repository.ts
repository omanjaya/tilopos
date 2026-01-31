export interface IOnlineStoreRepository {
  findStoresByBusinessId(businessId: string): Promise<any[]>;
  createStore(data: { businessId: string; storeName: string; slug: string; description: string | null }): Promise<any>;
  findStoreBySlug(slug: string): Promise<any | null>;
  findActiveProductsByBusinessId(businessId: string): Promise<any[]>;
  findStoreOrders(storeId: string, status?: string): Promise<any[]>;
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
  }): Promise<any>;
  updateOrderStatus(id: string, status: string): Promise<any>;
}
