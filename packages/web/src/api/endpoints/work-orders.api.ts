import { apiClient } from '../client';

export type WorkOrderPriority = 'low' | 'normal' | 'high' | 'urgent';
export type WorkOrderItemType = 'labor' | 'parts' | 'other';

export interface WorkOrderItem {
  id: string;
  workOrderId: string;
  description: string;
  type: WorkOrderItemType;
  quantity: number;
  unitPrice: number | string;
  subtotal: number | string;
}

export interface WorkOrder {
  id: string;
  businessId: string;
  outletId: string;
  customerId: string | null;
  employeeId: string | null;
  orderNumber: string;
  title: string;
  description: string | null;
  itemDescription: string | null;
  itemBrand: string | null;
  itemModel: string | null;
  itemSerial: string | null;
  diagnosis: string | null;
  status: 'pending' | 'in_progress' | 'waiting_parts' | 'completed' | 'delivered' | 'cancelled';
  priority: string;
  estimatedCost: number | string | null;
  finalCost: number | string | null;
  estimatedDate: string | null;
  completedAt: string | null;
  deliveredAt: string | null;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  createdAt: string;
  customer?: { name: string; phone: string | null } | null;
  employee?: { name: string } | null;
  items?: WorkOrderItem[];
}

export interface CreateWorkOrderRequest {
  outletId: string;
  customerId?: string;
  employeeId?: string;
  title: string;
  description?: string;
  itemDescription?: string;
  itemBrand?: string;
  itemModel?: string;
  itemSerial?: string;
  diagnosis?: string;
  priority?: WorkOrderPriority;
  estimatedCost?: number;
  estimatedDate?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  items?: { description: string; type: WorkOrderItemType; quantity: number; unitPrice: number }[];
}

/** Backend work-orders service returns bare Prisma rows (no `{ workOrder }` wrapper). */
export const workOrdersApi = {
  /** GET /work-orders/outlet/:id?status&search&page&limit(<=200, default 100) → array. */
  list: (outletId: string, filters?: { status?: string; search?: string; page?: number; limit?: number }) =>
    apiClient.get<WorkOrder[]>(`/work-orders/outlet/${outletId}`, { params: filters }).then((r) => r.data),

  getById: (id: string) => apiClient.get<WorkOrder>(`/work-orders/${id}`).then((r) => r.data),

  create: (data: CreateWorkOrderRequest) =>
    apiClient.post<WorkOrder>('/work-orders', data).then((r) => r.data),

  updateStatus: (id: string, status: WorkOrder['status']) =>
    apiClient.put<WorkOrder>(`/work-orders/${id}/status`, { status }).then((r) => r.data),
};
