import { apiClient } from '../client';
import type { PaginationParams, PaginatedResponse } from '@/types/api.types';
import type { Transaction, TransactionListParams } from '@/types/transaction.types';

export const transactionsApi = {
  list: (params?: TransactionListParams) =>
    apiClient.get<{ data: Transaction[] } | Transaction[]>('/pos/transactions', { params }).then((r) => {
      const d = r.data;
      return Array.isArray(d) ? d : d.data;
    }),

  listPaginated: (params?: PaginationParams & TransactionListParams) =>
    apiClient.get<PaginatedResponse<Transaction>>('/pos/transactions', { params }).then((r) => {
      const d = r.data;
      if (Array.isArray(d)) {
        return { data: d, total: d.length, page: 1, limit: d.length, totalPages: 1 } as PaginatedResponse<Transaction>;
      }
      return d;
    }),

  get: (id: string) =>
    apiClient.get<Transaction>(`/pos/transactions/${id}`).then((r) => r.data),

  void: (id: string, reason: string) =>
    apiClient.post('/pos/void', { transactionId: id, reason }).then((r) => r.data),

  refund: (data: { transactionId: string; items: { transactionItemId: string; quantity: number }[]; reason: string }) =>
    apiClient.post('/pos/refunds', data).then((r) => r.data),

  reprint: (id: string) =>
    apiClient.get(`/pos/transactions/${id}/reprint`).then((r) => r.data),
};
