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
  /** Prisma Decimal (string) or null when hidden from the caller's role. */
  costPrice: number | string | null;
  notes: string | null;
  createdAt: string;
  product?: { name: string; sku: string | null } | null;
  customer?: { name: string; phone: string | null } | null;
}

export const serialNumbersApi = {
  getWarrantyExpiring: (days?: number) =>
    apiClient
      .get<{ serials: SerialNumber[]; days: number }>('/serial-numbers/warranty-expiring', { params: days ? { days } : {} })
      .then((r) => r.data.serials),

  lookup: (serialNumber: string) =>
    // Backend returns the serial record itself (404 when not found)
    apiClient.get<SerialNumber>(`/serial-numbers/lookup/${encodeURIComponent(serialNumber)}`).then((r) => r.data),

  register: (data: {
    productId: string;
    outletId: string;
    serialNumber: string;
    purchaseDate?: string;
    warrantyExpiry?: string;
    costPrice?: number;
    notes?: string;
  }) => apiClient.post<{ serial: SerialNumber }>('/serial-numbers', data).then((r) => r.data.serial),

  markSold: (id: string, data?: { customerId?: string; transactionId?: string }) =>
    apiClient.put<{ serial: SerialNumber }>(`/serial-numbers/${id}/sold`, data ?? {}).then((r) => r.data.serial),

  markReturned: (id: string, notes?: string) =>
    apiClient.put<{ serial: SerialNumber }>(`/serial-numbers/${id}/returned`, { notes }).then((r) => r.data.serial),

  markWarranty: (id: string, notes?: string) =>
    apiClient.put<{ serial: SerialNumber }>(`/serial-numbers/${id}/warranty`, { notes }).then((r) => r.data.serial),

  markDefective: (id: string, notes?: string) =>
    apiClient.put<{ serial: SerialNumber }>(`/serial-numbers/${id}/defective`, { notes }).then((r) => r.data.serial),
};
