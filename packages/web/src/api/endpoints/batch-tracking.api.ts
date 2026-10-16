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

/** quantity / costPrice are Prisma Decimals serialized as strings — convert once here. */
function mapBatch(b: BatchLot): BatchLot {
  return {
    ...b,
    quantity: Number(b.quantity ?? 0),
    costPrice: b.costPrice == null ? null : Number(b.costPrice),
  };
}

export const batchTrackingApi = {
  create: (data: {
    productId: string;
    outletId: string;
    batchNumber: string;
    quantity: number;
    costPrice?: number;
    manufacturedAt?: string;
    expiresAt?: string;
    notes?: string;
  }) => apiClient.post<{ batch: BatchLot }>('/batch-tracking', data).then((r) => mapBatch(r.data.batch)),

  /** DELETE /batch-tracking/:id — owner/manager only, 204. */
  delete: (id: string) => apiClient.delete(`/batch-tracking/${id}`),

  getExpiring: (outletId: string, days?: number) =>
    apiClient
      .get<{ batches: BatchLot[]; daysAhead: number }>(`/batch-tracking/expiring/${outletId}`, {
        params: days ? { days } : {},
      })
      .then((r) => ({ ...r.data, batches: r.data.batches.map(mapBatch) })),

  getExpired: (outletId: string) =>
    apiClient
      .get<{ batches: BatchLot[] }>(`/batch-tracking/expired/${outletId}`)
      .then((r) => r.data.batches.map(mapBatch)),
};
