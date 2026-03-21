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

export interface CostPriceHistoryEntry {
  id: string;
  productId: string | null;
  variantId: string | null;
  previousCost: number;
  newCost: number;
  quantityBefore: number;
  quantityAdded: number;
  unitCostAdded: number;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
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
  approvedAt: string | null;
  shippedAt: string | null;
  receivedAt: string | null;
  receivedBy: string | null;
  items: StockTransferItem[];
  createdAt: string;
  updatedAt: string;
}

export interface TransferTemplateData {
  name: string;
  description?: string;
  sourceOutletId: string;
  destinationOutletId: string;
  items: { productId: string; productName: string; defaultQuantity: number }[];
}

export interface TransferDiscrepancy {
  itemName: string;
  sent: number;
  received: number;
  difference: number;
}

export interface StockTransferItem {
  id: string;
  productName: string;
  quantitySent: number;
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
