export interface IOrderRepository {
  findById(id: string): Promise<OrderRecord | null>;
  findByOutletId(outletId: string): Promise<OrderRecord[]>;
  findActiveByOutletId(outletId: string): Promise<OrderRecord[]>;
  save(order: OrderRecord): Promise<OrderRecord>;
  update(id: string, data: Partial<OrderRecord>): Promise<OrderRecord>;
}

export interface OrderRecord {
  id: string;
  outletId: string;
  orderNumber: string;
  orderType: string;
  tableId: string | null;
  customerId: string | null;
  status: string;
  priority: number;
  notes: string | null;
  estimatedTime: number | null;
  createdAt: Date;
  updatedAt: Date;
}
