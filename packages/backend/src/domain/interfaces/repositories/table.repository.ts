export type TableRecord = {
  id: string;
  outletId: string;
  name: string;
  capacity: number;
  section: string | null;
  positionX: number | null;
  positionY: number | null;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  currentOrderId: string | null;
  occupiedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
};

export interface CreateTableData {
  outletId: string;
  name: string;
  capacity?: number;
  section?: string;
  positionX?: number;
  positionY?: number;
}

export interface UpdateTableData {
  name?: string;
  capacity?: number;
  section?: string;
  positionX?: number;
  positionY?: number;
  status?: 'available' | 'occupied' | 'reserved' | 'cleaning';
  isActive?: boolean;
}

/** By-id methods are tenant scoped (R3): they only match tables of an outlet of `businessId`. */
export interface ITableRepository {
  findById(id: string, businessId: string): Promise<TableRecord | null>;
  findByOutlet(outletId: string, activeOnly?: boolean): Promise<TableRecord[]>;
  findBySection(outletId: string, section: string): Promise<TableRecord[]>;
  findByStatus(
    outletId: string,
    status: 'available' | 'occupied' | 'reserved' | 'cleaning',
  ): Promise<TableRecord[]>;
  create(data: CreateTableData): Promise<TableRecord>;
  /** Throws NotFound when the table is not in the business. */
  update(id: string, data: UpdateTableData, businessId: string): Promise<TableRecord>;
  /** Soft delete (isActive = false). Throws NotFound when the table is not in the business. */
  delete(id: string, businessId: string): Promise<void>;
  updateStatus(
    id: string,
    status: 'available' | 'occupied' | 'reserved' | 'cleaning',
    currentOrderId: string | undefined,
    businessId: string,
  ): Promise<TableRecord>;
}
