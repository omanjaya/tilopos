/**
 * Store Inventory Interfaces
 *
 * Interfaces for managing inventory status in the online store.
 */

export interface StoreInventoryItem {
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
  lowStockAlert: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface StoreInventoryResult {
  items: StoreInventoryItem[];
  summary: {
    total: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
  };
}
