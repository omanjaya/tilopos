export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
export type OrderItemStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
export type OrderType = 'dine_in' | 'takeaway' | 'delivery';

export interface Order {
  id: string;
  orderNumber: string;
  outletId: string;
  tableId: string | null;
  /** Only in GET /orders list rows (not in GET /orders/:id). */
  tableName?: string | null;
  customerId: string | null;
  status: OrderStatus;
  orderType: OrderType;
  /** 0 normal, 5 urgent, 10 vip */
  priority: number;
  items: OrderItem[];
  /** Only in GET /orders list rows (not in GET /orders/:id). */
  customerName?: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  notes: string | null;
  status: OrderItemStatus;
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
