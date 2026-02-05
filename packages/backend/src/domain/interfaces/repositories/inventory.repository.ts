export interface IInventoryRepository {
  findStockLevel(
    outletId: string,
    productId: string,
    variantId?: string | null,
  ): Promise<StockLevelRecord | null>;
  findStockLevelsByOutlet(outletId: string): Promise<StockLevelRecord[]>;
  findLowStockItems(outletId: string): Promise<StockLevelRecord[]>;
  updateStockLevel(id: string, quantity: number): Promise<StockLevelRecord>;
  createStockMovement(movement: StockMovementRecord): Promise<StockMovementRecord>;
}

export interface StockLevelRecord {
  id: string;
  outletId: string;
  productId: string | null;
  variantId: string | null;
  quantity: number;
  lowStockAlert: number;
  updatedAt: Date;
  product?: {
    id: string;
    name: string;
    sku: string | null;
  };
}

export interface StockMovementRecord {
  id: string;
  outletId: string;
  productId: string | null;
  variantId: string | null;
  movementType: string;
  quantity: number;
  referenceId: string | null;
  referenceType: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
}
