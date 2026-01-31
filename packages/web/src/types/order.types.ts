export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
export type OrderType = 'dine_in' | 'take_away' | 'delivery';

export interface Order {
  id: string;
  orderNumber: string;
  outletId: string;
  tableId: string | null;
  tableName: string | null;
  status: OrderStatus;
  orderType: OrderType;
  items: OrderItem[];
  employeeName: string;
  customerName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  notes: string | null;
  status: OrderStatus;
}

export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  outletId: string;
  outletName: string;
  openingCash: number;
  closingCash: number | null;
  expectedCash: number | null;
  cashDifference: number | null;
  startedAt: string;
  endedAt: string | null;
  notes: string | null;
  totalSales: number;
  totalTransactions: number;
}

export interface CashMovement {
  id: string;
  shiftId: string;
  type: 'cash_in' | 'cash_out';
  amount: number;
  notes: string | null;
  createdAt: string;
}
