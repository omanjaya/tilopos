import { apiClient } from '../client';
import type {
  Settlement,
  SettlementListParams,
  SettleRequest,
} from '@/types/settlement.types';

export const settlementsApi = {
  /**
   * GET /settlements — one row per outlet/date/payment method, plain array bounded
   * by page/limit (default 20, max 100). dateFrom/dateTo are YYYY-MM-DD.
   */
  list: (params?: SettlementListParams) =>
    apiClient
      .get<Settlement[]>('/settlements', { params: { limit: 100, ...params } })
      .then((r) => {
        if (!Array.isArray(r.data)) {
          throw new Error('Format respons penyelesaian tidak valid');
        }
        return r.data;
      }),

  /** POST variant persists `notes`. A non-pending settlement answers 409. */
  settle: (id: string, data?: SettleRequest) =>
    apiClient.post<Settlement>(`/settlements/${id}/settle`, data ?? {}).then((r) => r.data),
};
