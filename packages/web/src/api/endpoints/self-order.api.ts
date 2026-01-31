import { apiClient } from '../client';
import type { SelfOrderSession, SelfOrderMenuItem, CreateSelfOrderSessionRequest } from '@/types/self-order.types';

export const selfOrderApi = {
  createSession: (data: CreateSelfOrderSessionRequest) =>
    apiClient.post<SelfOrderSession>('/self-order/sessions', data).then((r) => r.data),

  getSession: (sessionCode: string) =>
    apiClient.get<SelfOrderSession & { outletName?: string; tableNumber?: string }>(`/self-order/sessions/${sessionCode}`).then((r) => r.data),

  getMenu: (outletId: string) =>
    apiClient
      .get<SelfOrderMenuItem[]>('/self-order/menu', { params: { outletId } })
      .then((r) => {
        const raw = r.data;
        // Backend returns flat array of menu items
        if (Array.isArray(raw)) return raw;
        // If wrapped in categories structure, flatten
        const data = raw as Record<string, unknown>;
        if (Array.isArray(data.categories)) {
          const items: SelfOrderMenuItem[] = [];
          for (const cat of data.categories as Array<Record<string, unknown>>) {
            const products = (cat.products ?? []) as SelfOrderMenuItem[];
            for (const p of products) {
              items.push({ ...p, categoryName: (p.categoryName ?? cat.name ?? '') as string });
            }
          }
          return items;
        }
        return [];
      }),

  addItem: (sessionCode: string, data: { productId: string; variantId?: string; quantity: number; notes?: string }) =>
    apiClient.post(`/self-order/sessions/${sessionCode}/items`, data).then((r) => r.data),

  submitSession: (sessionCode: string) =>
    apiClient.post(`/self-order/sessions/${sessionCode}/submit`).then((r) => r.data),
};
