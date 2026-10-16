/**
 * Every by-id method is tenant scoped (R3): a shift id from the client only matches when the
 * shift's outlet belongs to `businessId`. Mutations throw NotFound when nothing matched.
 */
export interface IShiftRepository {
  findById(id: string, businessId: string): Promise<ShiftRecord | null>;
  findOpenShift(employeeId: string): Promise<ShiftRecord | null>;
  create(data: CreateShiftData): Promise<ShiftRecord>;
  /** Closes an OPEN shift; throws Conflict if it is already closed (no overwrite). */
  close(id: string, businessId: string, data: CloseShiftData): Promise<ShiftRecord>;
  addCashIn(id: string, businessId: string, amount: number): Promise<void>;
  addCashOut(id: string, businessId: string, amount: number): Promise<void>;
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
  notes?: string;
}
