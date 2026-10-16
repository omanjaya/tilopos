export interface IOrderRepository {
  /** Pass businessId whenever the id comes from a client (R3). */
  findById(id: string, businessId?: string): Promise<OrderRecord | null>;
  findByOutletId(outletId: string): Promise<OrderRecord[]>;
  findActiveByOutletId(outletId: string): Promise<OrderRecord[]>;
  save(order: OrderRecord): Promise<OrderRecord>;
  update(id: string, data: Partial<OrderRecord>, businessId?: string): Promise<OrderRecord>;
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
  startedAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
