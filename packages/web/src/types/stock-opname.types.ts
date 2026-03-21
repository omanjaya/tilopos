export type StockOpnameStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';

export interface StockOpname {
  id: string;
  outletId: string;
  opnameNumber: string;
  status: StockOpnameStatus;
  notes: string | null;
  createdBy: string;
  createdByEmployee: { name: string };
  approvedBy: string | null;
  approvedByEmployee: { name: string } | null;
  outlet: { name: string };
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  itemCount: number;
  countedCount: number;
  discrepancyCount: number;
}

export interface StockOpnameItem {
  id: string;
  productId: string | null;
  variantId: string | null;
  product: { name: string; sku: string | null } | null;
  variant: { name: string; sku: string | null } | null;
  systemQuantity: number;
  actualQuantity: number | null;
  difference: number | null;
  notes: string | null;
}

export interface StockOpnameDetail extends Omit<StockOpname, 'itemCount' | 'countedCount' | 'discrepancyCount'> {
  items: StockOpnameItem[];
}

export interface CreateStockOpnameRequest {
  outletId: string;
  productIds?: string[];
  notes?: string;
}

export interface UpdateOpnameItemRequest {
  itemId: string;
  actualQuantity: number;
  notes?: string;
}
