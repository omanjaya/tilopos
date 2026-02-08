import { apiClient } from '../client';

export interface ServiceItem {
  id: string;
  businessId: string;
  outletId: string;
  customerId: string | null;
  ticketNumber: string;
  itemName: string;
  itemDescription: string | null;
  quantity: number;
  serviceName: string;
  servicePrice: number;
  status: 'received' | 'processing' | 'ready' | 'delivered' | 'cancelled';
  receivedAt: string;
  processedAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  estimatedReady: string | null;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  createdAt: string;
  customer?: { name: string; phone: string | null } | null;
}

export const itemTrackingApi = {
  listByOutlet: (outletId: string, filters?: { status?: string; search?: string }) =>
    apiClient.get<{ serviceItems: ServiceItem[] }>(`/item-tracking/outlet/${outletId}`, { params: filters }).then((r) => r.data.serviceItems),

  getActive: (outletId: string) =>
    apiClient.get<{ serviceItems: ServiceItem[] }>(`/item-tracking/active/${outletId}`).then((r) => r.data.serviceItems),

  listByCustomer: (customerId: string) =>
    apiClient.get<{ serviceItems: ServiceItem[] }>(`/item-tracking/customer/${customerId}`).then((r) => r.data.serviceItems),

  findByTicket: (ticketNumber: string) =>
    apiClient.get<{ serviceItem: ServiceItem }>(`/item-tracking/ticket/${encodeURIComponent(ticketNumber)}`).then((r) => r.data.serviceItem),

  getById: (id: string) =>
    apiClient.get<{ serviceItem: ServiceItem }>(`/item-tracking/${id}`).then((r) => r.data.serviceItem),

  receive: (data: {
    outletId: string;
    customerId?: string;
    itemName: string;
    itemDescription?: string;
    quantity?: number;
    serviceName: string;
    servicePrice: number;
    estimatedReady?: string;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
  }) => apiClient.post<{ serviceItem: ServiceItem }>('/item-tracking', data).then((r) => r.data.serviceItem),

  update: (id: string, data: Partial<ServiceItem>) =>
    apiClient.put<{ serviceItem: ServiceItem }>(`/item-tracking/${id}`, data).then((r) => r.data.serviceItem),

  updateStatus: (id: string, status: string) =>
    apiClient.put<{ serviceItem: ServiceItem }>(`/item-tracking/${id}/status`, { status }).then((r) => r.data.serviceItem),

  delete: (id: string) =>
    apiClient.delete(`/item-tracking/${id}`),
};
