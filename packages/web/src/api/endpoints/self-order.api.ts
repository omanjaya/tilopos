import { apiClient } from '../client';
import type {
  SelfOrderSession,
  SelfOrderMenuItem,
  SelfOrderSessionTotal,
} from '@/types/self-order.types';

/** POST /self-order/sessions/:code/items (AddSelfOrderItemDto); prices are resolved server-side. */
export interface SelfOrderAddItemRequest {
  productId: string;
  variantId?: string;
  /** 1..99 */
  quantity: number;
  /** Modifier ids (max 20, unique). */
  modifierIds?: string[];
  notes?: string;
}

export interface SelfOrderSubmitResponse {
  success: boolean;
  orderId: string;
  orderNumber: string;
}

export const selfOrderApi = {
  getSession: (sessionCode: string) =>
    apiClient.get<SelfOrderSession>(`/self-order/sessions/${sessionCode}`).then((r) => r.data),

  /** Backend returns a flat array of menu items. */
  getMenu: (outletId: string) =>
    apiClient
      .get<SelfOrderMenuItem[]>('/self-order/menu', { params: { outletId } })
      .then((r) => {
        if (!Array.isArray(r.data)) {
          throw new Error('Format menu dari server tidak dikenali');
        }
        return r.data;
      }),

  addItem: (sessionCode: string, data: SelfOrderAddItemRequest) =>
    apiClient.post(`/self-order/sessions/${sessionCode}/items`, data).then((r) => r.data),

  getSessionTotal: (sessionCode: string) =>
    apiClient
      .get<SelfOrderSessionTotal>(`/self-order/sessions/${sessionCode}/total`)
      .then((r) => r.data),

  submitSession: (sessionCode: string) =>
    apiClient
      .post<SelfOrderSubmitResponse>(`/self-order/sessions/${sessionCode}/submit`)
      .then((r) => r.data),
};
