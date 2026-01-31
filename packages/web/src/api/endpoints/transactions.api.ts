import { apiClient } from '../client';
import type { Transaction, TransactionListParams } from '@/types/transaction.types';

export const transactionsApi = {
  list: (params?: TransactionListParams) =>
    apiClient.get<Transaction[]>('/pos/transactions', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Transaction>(`/pos/transactions/${id}`).then((r) => r.data),

  void: (id: string, reason: string) =>
    apiClient.post('/pos/void', { transactionId: id, reason }).then((r) => r.data),

  refund: (data: { transactionId: string; items: { transactionItemId: string; quantity: number }[]; reason: string }) =>
    apiClient.post('/pos/refunds', data).then((r) => r.data),

  reprint: (id: string) =>
    apiClient.get(`/pos/transactions/${id}/reprint`).then((r) => r.data),
};
