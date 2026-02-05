export interface SupplierRecord {
  id: string;
  businessId: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrderRecord {
  id: string;
  outletId: string;
  supplierId: string;
  poNumber: string;
  status: string;
  totalAmount: number;
  notes: string | null;
  orderedAt: Date | null;
  receivedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISupplierRepository {
  findByBusinessId(businessId: string): Promise<SupplierRecord[]>;
  save(data: CreateSupplierData): Promise<SupplierRecord>;
  update(id: string, data: Record<string, unknown>): Promise<SupplierRecord>;
  deactivate(id: string): Promise<void>;
  findPurchaseOrdersByOutlet(outletId: string): Promise<PurchaseOrderRecord[]>;
  findPurchaseOrderById(id: string): Promise<PurchaseOrderRecord | null>;
  createPurchaseOrder(data: CreatePurchaseOrderData): Promise<PurchaseOrderRecord>;
  receivePurchaseOrder(id: string): Promise<PurchaseOrderRecord>;
}

export interface CreateSupplierData {
  businessId: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface CreatePurchaseOrderData {
  outletId: string;
  supplierId: string;
  poNumber: string;
  totalAmount: number;
  createdBy: string;
  items: {
    itemName: string;
    quantityOrdered: number;
    unitCost: number;
    subtotal: number;
    productId: string | null;
    variantId: string | null;
    ingredientId: string | null;
  }[];
}
