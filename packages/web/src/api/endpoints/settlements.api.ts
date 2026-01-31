import { apiClient } from '../client';
import type {
  Settlement,
  SettlementListParams,
  SettleRequest,
  DisputeRequest,
} from '@/types/settlement.types';

export const settlementsApi = {
  list: (params?: SettlementListParams) =>
    apiClient.get('/settlements', { params }).then((r) => {
      const raw = r.data;
      const arr = (Array.isArray(raw) ? raw : []) as Array<Record<string, unknown>>;
      // Add null-safe defaults for fields the frontend expects
      return arr.map((s) => ({
        ...s,
        totalSales: Number(s.totalSales ?? s.grossAmount ?? 0),
        cashAmount: Number(s.cashAmount ?? 0),
        nonCashAmount: Number(s.nonCashAmount ?? 0),
        settledAmount: Number(s.settledAmount ?? s.netAmount ?? 0),
        paymentBreakdown: Array.isArray(s.paymentBreakdown) ? s.paymentBreakdown : [],
        outletName: (s.outletName ?? '') as string,
        notes: (s.notes ?? null) as string | null,
        settledAt: (s.settledAt ?? null) as string | null,
        date: (s.date ?? s.settlementDate ?? s.createdAt ?? '') as string,
      })) as Settlement[];
    }),

  get: (id: string) =>
    apiClient.get<Settlement>(`/settlements/${id}`).then((r) => r.data),

  settle: (id: string, data?: SettleRequest) =>
    apiClient.put<Settlement>(`/settlements/${id}/settle`, data).then((r) => r.data),

  dispute: (id: string, data: DisputeRequest) =>
    apiClient.put<Settlement>(`/settlements/${id}/dispute`, data).then((r) => r.data),
};
