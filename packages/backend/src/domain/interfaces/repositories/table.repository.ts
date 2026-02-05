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

export interface ITableRepository {
  findById(id: string): Promise<TableRecord | null>;
  findByOutlet(outletId: string, activeOnly?: boolean): Promise<TableRecord[]>;
  findBySection(outletId: string, section: string): Promise<TableRecord[]>;
  findByStatus(
    outletId: string,
    status: 'available' | 'occupied' | 'reserved' | 'cleaning',
  ): Promise<TableRecord[]>;
  create(data: CreateTableData): Promise<TableRecord>;
  update(id: string, data: UpdateTableData): Promise<TableRecord>;
  delete(id: string): Promise<void>;
  updateStatus(
    id: string,
    status: 'available' | 'occupied' | 'reserved' | 'cleaning',
    currentOrderId?: string,
  ): Promise<TableRecord>;
}
