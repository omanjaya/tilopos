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

export type ServiceItemStatus = ServiceItem['status'];

/** servicePrice is a Prisma Decimal serialized as a string — convert once here. */
function mapItem(d: ServiceItem): ServiceItem {
  return { ...d, servicePrice: Number(d.servicePrice ?? 0) };
}

function mapList(data: unknown, endpoint: string): ServiceItem[] {
  if (!Array.isArray(data)) throw new Error(`Respons tidak valid dari ${endpoint}`);
  return (data as ServiceItem[]).map(mapItem);
}

export const itemTrackingApi = {
  /** GET /item-tracking/outlet/:id — plain array (status must be a ServiceItemStatus). */
  listByOutlet: (outletId: string, filters?: { status?: ServiceItemStatus; search?: string }) =>
    apiClient
      .get<unknown>(`/item-tracking/outlet/${outletId}`, { params: filters })
      .then((r) => mapList(r.data, '/item-tracking/outlet')),

  getActive: (outletId: string) =>
    apiClient
      .get<unknown>(`/item-tracking/active/${outletId}`)
      .then((r) => mapList(r.data, '/item-tracking/active')),

  /** 404 when the ticket does not exist in this business. */
  findByTicket: (ticketNumber: string) =>
    apiClient
      .get<ServiceItem>(`/item-tracking/ticket/${encodeURIComponent(ticketNumber)}`)
      .then((r) => mapItem(r.data)),

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
  }) => apiClient.post<ServiceItem>('/item-tracking', data).then((r) => mapItem(r.data)),

  updateStatus: (id: string, status: ServiceItemStatus) =>
    apiClient.put<ServiceItem>(`/item-tracking/${id}/status`, { status }).then((r) => mapItem(r.data)),
};
