export interface IShiftRepository {
  findById(id: string): Promise<ShiftRecord | null>;
  findOpenShift(employeeId: string): Promise<ShiftRecord | null>;
  create(data: CreateShiftData): Promise<ShiftRecord>;
  close(id: string, data: CloseShiftData): Promise<ShiftRecord>;
  addCashIn(id: string, amount: number): Promise<void>;
  addCashOut(id: string, amount: number): Promise<void>;
}

export interface ShiftRecord {
  id: string;
  outletId: string;
  employeeId: string;
  startedAt: Date;
  endedAt: Date | null;
  openingCash: number;
  closingCash: number | null;
  expectedCash: number | null;
  cashDifference: number | null;
  cashIn: number | null;
  cashOut: number | null;
  notes: string | null;
  status: string;
  createdAt: Date;
}

export interface CreateShiftData {
  outletId: string;
  employeeId: string;
  openingCash: number;
  startedAt: Date;
}

export interface CloseShiftData {
  closingCash: number;
  expectedCash: number;
  cashDifference: number;
  endedAt: Date;
}
