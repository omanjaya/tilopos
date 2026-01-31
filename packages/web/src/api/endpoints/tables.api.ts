import { apiClient } from '../client';

export const tablesApi = {
  splitBill: (data: { transactionId: string; numberOfSplits: number }) =>
    apiClient.post('/tables/split-bill', data).then((r) => r.data),

  mergeBill: (data: { transactionIds: string[] }) =>
    apiClient.post('/tables/merge-bill', data).then((r) => r.data),
};
