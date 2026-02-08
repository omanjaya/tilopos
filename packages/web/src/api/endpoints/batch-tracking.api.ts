import { apiClient } from '../client';

export interface BatchLot {
  id: string;
  productId: string;
  outletId: string;
  batchNumber: string;
  quantity: number;
  costPrice: number | null;
  manufacturedAt: string | null;
  expiresAt: string | null;
  receivedAt: string;
  status: 'active' | 'depleted' | 'expired' | 'recalled';
  notes: string | null;
  product?: { name: string; sku: string | null };
}

export interface BatchSummary {
  totalQuantity: number;
  activeBatches: number;
  expiredBatches: number;
  expiringWithin7Days: number;
  batches: BatchLot[];
}

export const batchTrackingApi = {
  listByProduct: (productId: string, outletId: string) =>
    apiClient.get<{ batches: BatchLot[] }>(`/batch-tracking/product/${productId}/outlet/${outletId}`).then((r) => r.data.batches),

  listActive: (productId: string, outletId: string) =>
    apiClient.get<{ batches: BatchLot[] }>(`/batch-tracking/active/${productId}/${outletId}`).then((r) => r.data.batches),

  create: (data: {
    productId: string;
    outletId: string;
    batchNumber: string;
    quantity: number;
    costPrice?: number;
    manufacturedAt?: string;
    expiresAt?: string;
    notes?: string;
  }) => apiClient.post<{ batch: BatchLot }>('/batch-tracking', data).then((r) => r.data.batch),

  update: (id: string, data: Partial<BatchLot>) =>
    apiClient.put<{ batch: BatchLot }>(`/batch-tracking/${id}`, data).then((r) => r.data.batch),

  delete: (id: string) => apiClient.delete(`/batch-tracking/${id}`),

  getSummary: (productId: string, outletId: string) =>
    apiClient.get<BatchSummary>(`/batch-tracking/summary/${productId}/${outletId}`).then((r) => r.data),

  getExpiring: (outletId: string, days?: number) =>
    apiClient.get<{ batches: BatchLot[]; daysAhead: number }>(`/batch-tracking/expiring/${outletId}${days ? `?days=${days}` : ''}`).then((r) => r.data),

  getExpired: (outletId: string) =>
    apiClient.get<{ batches: BatchLot[] }>(`/batch-tracking/expired/${outletId}`).then((r) => r.data.batches),
};
