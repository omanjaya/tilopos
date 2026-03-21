import { apiClient } from '../client';

export interface TableApiResponse {
  id: string;
  outletId: string;
  name: string;
  capacity: number;
  section: string | null;
  positionX: number | null;
  positionY: number | null;
  status: string;
  currentOrderId: string | null;
  occupiedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export const tablesApi = {
  list: (params: {
    outletId: string;
    section?: string;
    status?: string;
    activeOnly?: boolean;
  }): Promise<TableApiResponse[]> =>
    apiClient
      .get('/tables', { params })
      .then((r) => r.data),

  splitBill: (data: { transactionId: string; numberOfSplits: number }) =>
    apiClient.post('/tables/split-bill', data).then((r) => r.data),

  mergeBill: (data: { transactionIds: string[] }) =>
    apiClient.post('/tables/merge-bill', data).then((r) => r.data),
};
