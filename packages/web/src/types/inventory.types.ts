export interface StockLevel {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  maxStock: number | null;
  outletId: string;
  updatedAt: string;
}

export interface StockAdjustmentRequest {
  productId: string;
  outletId: string;
  quantity: number;
  reason: string;
  type: 'add' | 'remove' | 'set';
  unitCost?: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  businessId: string;
  createdAt: string;
}

export interface CreateSupplierRequest {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
}

// Transfer and purchase-order types live next to their API wrapper:
// see StockTransferView / PurchaseOrderView in src/api/endpoints/inventory.api.ts.
