export interface IInventoryRepository {
  findStockLevel(
    outletId: string,
    productId: string,
    variantId?: string | null,
  ): Promise<StockLevelRecord | null>;
  findStockLevelsByOutlet(outletId: string): Promise<StockLevelRecord[]>;
  findLowStockItems(outletId: string): Promise<StockLevelRecord[]>;
  incrementStockLevel(id: string, incrementBy: number): Promise<StockLevelRecord>;
  createStockMovement(movement: StockMovementRecord): Promise<StockMovementRecord>;
  /** Scoped to one outlet (R3): reference ids alone are not tenant safe. */
  findStockMovements(filter: {
    outletId: string;
    referenceId: string;
    referenceType: string;
  }): Promise<StockMovementRecord[]>;
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
  variant?: {
    id: string;
    name: string;
    sku: string | null;
  } | null;
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
