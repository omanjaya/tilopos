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
}

export type TransferStatus = 'requested' | 'approved' | 'shipped' | 'in_transit' | 'received' | 'cancelled';

export interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceOutletId: string;
  sourceOutletName: string;
  destinationOutletId: string;
  destinationOutletName: string;
  status: TransferStatus;
  notes: string | null;
  requestedBy: string;
  approvedBy: string | null;
  items: StockTransferItem[];
  createdAt: string;
  updatedAt: string;
}

export interface StockTransferItem {
  id: string;
  productName: string;
  requestedQuantity: number;
  receivedQuantity: number | null;
}

export interface CreateTransferRequest {
  sourceOutletId: string;
  destinationOutletId: string;
  items: { productId: string; quantity: number }[];
  notes?: string;
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

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  outletId: string;
  outletName: string;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  totalAmount: number;
  notes: string | null;
  items: PurchaseOrderItem[];
  createdAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  receivedQuantity: number | null;
}

export interface CreatePurchaseOrderRequest {
  supplierId: string;
  outletId: string;
  items: { productId: string; quantity: number; unitPrice: number }[];
  notes?: string;
}
