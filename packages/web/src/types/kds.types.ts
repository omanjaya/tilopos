export type KDSOrderStatus = 'pending' | 'preparing' | 'ready' | 'served';

export type KDSOrderPriority = 'normal' | 'urgent' | 'vip';

export interface KDSOrder {
  id: string;
  orderNumber: string;
  tableName: string | null;
  orderType: string;
  items: KDSOrderItem[];
  createdAt: string;
  elapsedMinutes: number;
  priority?: KDSOrderPriority;
}

export interface KDSOrderItem {
  id: string;
  productName: string;
  quantity: number;
  notes: string | null;
  modifiers: string[];
  status: KDSOrderStatus;
}
