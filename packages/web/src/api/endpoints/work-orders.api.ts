import { apiClient } from '../client';

export interface WorkOrderItem {
  id: string;
  workOrderId: string;
  description: string;
  type: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
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
  estimatedCost: number | null;
  finalCost: number | null;
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

export const workOrdersApi = {
  list: (outletId: string, filters?: { status?: string; search?: string }) =>
    apiClient.get<{ workOrders: WorkOrder[] }>(`/work-orders/outlet/${outletId}`, { params: filters }).then((r) => r.data.workOrders),

  getById: (id: string) =>
    apiClient.get<{ workOrder: WorkOrder }>(`/work-orders/${id}`).then((r) => r.data.workOrder),

  create: (data: {
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
    priority?: string;
    estimatedCost?: number;
    estimatedDate?: string;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
    items?: { description: string; type: string; quantity: number; unitPrice: number }[];
  }) => apiClient.post<{ workOrder: WorkOrder }>('/work-orders', data).then((r) => r.data.workOrder),

  update: (id: string, data: Partial<WorkOrder>) =>
    apiClient.put<{ workOrder: WorkOrder }>(`/work-orders/${id}`, data).then((r) => r.data.workOrder),

  updateStatus: (id: string, status: string) =>
    apiClient.put<{ workOrder: WorkOrder }>(`/work-orders/${id}/status`, { status }).then((r) => r.data.workOrder),

  addItem: (workOrderId: string, data: { description: string; type: string; quantity: number; unitPrice: number }) =>
    apiClient.post<{ item: WorkOrderItem }>(`/work-orders/${workOrderId}/items`, data).then((r) => r.data.item),

  removeItem: (itemId: string) =>
    apiClient.delete(`/work-orders/items/${itemId}`),

  getTotal: (id: string) =>
    apiClient.get<{ total: number }>(`/work-orders/${id}/total`).then((r) => r.data.total),
};
