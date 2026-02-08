import { apiClient } from '../client';

export interface SerialNumber {
  id: string;
  businessId: string;
  productId: string;
  outletId: string;
  serialNumber: string;
  status: 'in_stock' | 'sold' | 'returned' | 'warranty' | 'defective';
  purchaseDate: string | null;
  soldDate: string | null;
  warrantyExpiry: string | null;
  customerId: string | null;
  transactionId: string | null;
  costPrice: number | null;
  notes: string | null;
  createdAt: string;
  product?: { name: string; sku: string | null } | null;
  customer?: { name: string; phone: string | null } | null;
}

export const serialNumbersApi = {
  listByProduct: (productId: string, outletId: string, status?: string) =>
    apiClient.get<{ serialNumbers: SerialNumber[] }>(`/serial-numbers/product/${productId}/${outletId}`, { params: status ? { status } : {} }).then((r) => r.data.serialNumbers),

  listByCustomer: (customerId: string) =>
    apiClient.get<{ serialNumbers: SerialNumber[] }>(`/serial-numbers/customer/${customerId}`).then((r) => r.data.serialNumbers),

  getWarrantyExpiring: (days?: number) =>
    apiClient.get<{ serialNumbers: SerialNumber[] }>('/serial-numbers/warranty-expiring', { params: days ? { days } : {} }).then((r) => r.data.serialNumbers),

  lookup: (serialNumber: string) =>
    apiClient.get<{ serialNumber: SerialNumber }>(`/serial-numbers/lookup/${encodeURIComponent(serialNumber)}`).then((r) => r.data.serialNumber),

  register: (data: {
    productId: string;
    outletId: string;
    serialNumber: string;
    purchaseDate?: string;
    warrantyExpiry?: string;
    costPrice?: number;
    notes?: string;
  }) => apiClient.post<{ serialNumber: SerialNumber }>('/serial-numbers', data).then((r) => r.data.serialNumber),

  bulkRegister: (items: { productId: string; outletId: string; serialNumber: string; costPrice?: number }[]) =>
    apiClient.post<{ count: number }>('/serial-numbers/bulk', { items }).then((r) => r.data.count),

  update: (id: string, data: Partial<SerialNumber>) =>
    apiClient.put<{ serialNumber: SerialNumber }>(`/serial-numbers/${id}`, data).then((r) => r.data.serialNumber),

  markSold: (id: string, data?: { customerId?: string; transactionId?: string }) =>
    apiClient.put<{ serialNumber: SerialNumber }>(`/serial-numbers/${id}/sold`, data ?? {}).then((r) => r.data.serialNumber),

  markReturned: (id: string, notes?: string) =>
    apiClient.put<{ serialNumber: SerialNumber }>(`/serial-numbers/${id}/returned`, { notes }).then((r) => r.data.serialNumber),

  markWarranty: (id: string, notes?: string) =>
    apiClient.put<{ serialNumber: SerialNumber }>(`/serial-numbers/${id}/warranty`, { notes }).then((r) => r.data.serialNumber),

  markDefective: (id: string, notes?: string) =>
    apiClient.put<{ serialNumber: SerialNumber }>(`/serial-numbers/${id}/defective`, { notes }).then((r) => r.data.serialNumber),

  delete: (id: string) =>
    apiClient.delete(`/serial-numbers/${id}`),
};
