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
    apiClient.get<ServiceItem[]>(`/item-tracking/outlet/${outletId}`, { params: filters }).then((r) => {
      const d = r.data;
      if (Array.isArray(d)) return d;
      if (d && typeof d === 'object' && 'serviceItems' in d) return (d as { serviceItems: ServiceItem[] }).serviceItems;
      return [];
    }),

  getActive: (outletId: string) =>
    apiClient.get<ServiceItem[]>(`/item-tracking/active/${outletId}`).then((r) => {
      const d = r.data;
      if (Array.isArray(d)) return d;
      if (d && typeof d === 'object' && 'serviceItems' in d) return (d as { serviceItems: ServiceItem[] }).serviceItems;
      return [];
    }),

  listByCustomer: (customerId: string) =>
    apiClient.get<ServiceItem[]>(`/item-tracking/customer/${customerId}`).then((r) => {
      const d = r.data;
      if (Array.isArray(d)) return d;
      if (d && typeof d === 'object' && 'serviceItems' in d) return (d as { serviceItems: ServiceItem[] }).serviceItems;
      return [];
    }),

  findByTicket: (ticketNumber: string) =>
    apiClient.get<ServiceItem>(`/item-tracking/ticket/${encodeURIComponent(ticketNumber)}`).then((r) => {
      const d = r.data;
      if (d && typeof d === 'object' && 'serviceItem' in d) return (d as { serviceItem: ServiceItem }).serviceItem;
      return d as ServiceItem;
    }),

  getById: (id: string) =>
    apiClient.get<ServiceItem>(`/item-tracking/${id}`).then((r) => {
      const d = r.data;
      if (d && typeof d === 'object' && 'serviceItem' in d) return (d as { serviceItem: ServiceItem }).serviceItem;
      return d as ServiceItem;
    }),

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
  }) => apiClient.post<ServiceItem>('/item-tracking', data).then((r) => {
    const d = r.data;
    if (d && typeof d === 'object' && 'serviceItem' in d) return (d as { serviceItem: ServiceItem }).serviceItem;
    return d as ServiceItem;
  }),

  update: (id: string, data: Partial<ServiceItem>) =>
    apiClient.put<ServiceItem>(`/item-tracking/${id}`, data).then((r) => {
      const d = r.data;
      if (d && typeof d === 'object' && 'serviceItem' in d) return (d as { serviceItem: ServiceItem }).serviceItem;
      return d as ServiceItem;
    }),

  updateStatus: (id: string, status: string) =>
    apiClient.put<ServiceItem>(`/item-tracking/${id}/status`, { status }).then((r) => {
      const d = r.data;
      if (d && typeof d === 'object' && 'serviceItem' in d) return (d as { serviceItem: ServiceItem }).serviceItem;
      return d as ServiceItem;
    }),

  delete: (id: string) =>
    apiClient.delete(`/item-tracking/${id}`),
};
