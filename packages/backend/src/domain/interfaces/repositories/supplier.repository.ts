export interface ISupplierRepository {
  findByBusinessId(businessId: string): Promise<any[]>;
  save(data: CreateSupplierData): Promise<any>;
  update(id: string, data: Record<string, unknown>): Promise<any>;
  deactivate(id: string): Promise<void>;
  findPurchaseOrdersByOutlet(outletId: string): Promise<any[]>;
  findPurchaseOrderById(id: string): Promise<any | null>;
  createPurchaseOrder(data: CreatePurchaseOrderData): Promise<any>;
  receivePurchaseOrder(id: string): Promise<any>;
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
