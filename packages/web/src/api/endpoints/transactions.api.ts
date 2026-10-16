import { apiClient } from '../client';
import type { PaginationParams, PaginatedResponse } from '@/types/api.types';
import type {
  Transaction,
  TransactionListParams,
  TransactionListSummary,
} from '@/types/transaction.types';
import type { ReceiptData } from '@/types/pos.types';

/**
 * ProcessRefundDto (backend application/dtos/refund.dto.ts). 'store_credit' is
 * rejected with 422 (not supported); 'original_method' is refused for
 * gateway-captured payments; cash refunds need an open shift of the refunding
 * employee at the outlet. Quantities may have 3 decimals.
 */
export type RefundMethod = 'cash' | 'original_method';
export type RefundReason = 'defect' | 'wrong_order' | 'customer_request' | 'other';
export interface RefundRequest {
  transactionId: string;
  items: { transactionItemId: string; quantity: number; reason: RefundReason }[];
  refundMethod: RefundMethod;
  notes?: string;
}

/** GET /pos/transactions response. */
export interface TransactionListResponse extends PaginatedResponse<Transaction> {
  summary: TransactionListSummary;
}

/** GET /pos/transactions/:id/reprint response (ReprintReceiptUseCase). */
export interface ReprintResponse extends Omit<ReceiptData, 'transaction'> {
  transaction: Omit<ReceiptData['transaction'], 'items' | 'payments'> & {
    receiptNumber: string;
    grandTotal: number;
    items: Array<ReceiptData['transaction']['items'][number] & { totalPrice: number }>;
    payments: Array<{ id: string; method: string; amount: number; status: string; reference: string | null }>;
  };
  isReprint: boolean;
  reprintedAt: string;
}

export const transactionsApi = {
  list: (params?: TransactionListParams) =>
    apiClient.get<TransactionListResponse>('/pos/transactions', { params }).then((r) => r.data.data),

  /** Paged list; `summary` covers the whole filtered set. Backend ignores sortBy/sortOrder. */
  listPaginated: (params?: PaginationParams & TransactionListParams) => {
    const rest: Record<string, unknown> = { ...params };
    delete rest.sortBy;
    delete rest.sortOrder;
    return apiClient
      .get<TransactionListResponse>('/pos/transactions', { params: rest })
      .then((r) => r.data);
  },

  /** GET /pos/transactions/:id — same mapped DTO as a list row. */
  get: (id: string) =>
    apiClient.get<Transaction>(`/pos/transactions/${id}`).then((r) => r.data),

  void: (id: string, reason: string) =>
    apiClient.post('/pos/void', { transactionId: id, reason }).then((r) => r.data),

  /** POST /pos/refunds — body must match ProcessRefundDto exactly. */
  refund: (data: RefundRequest) =>
    apiClient.post('/pos/refunds', data).then((r) => r.data),

  reprint: (id: string) =>
    apiClient.get<ReprintResponse>(`/pos/transactions/${id}/reprint`).then((r) => r.data),
};
