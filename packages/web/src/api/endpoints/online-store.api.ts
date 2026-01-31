import { apiClient } from '../client';
import type {
  OnlineStore,
  CreateOnlineStoreRequest,
  Storefront,
  CreateStorefrontOrderRequest,
  StorefrontOrder,
} from '@/types/online-store.types';

export const onlineStoreApi = {
  // Admin endpoints
  getStores: () =>
    apiClient.get('/online-store/stores').then((r) => {
      const raw = r.data;
      const arr = (Array.isArray(raw) ? raw : []) as Array<Record<string, unknown>>;
      // Backend may return storeName instead of name
      return arr.map((s) => ({
        ...s,
        name: (s.name ?? s.storeName ?? '') as string,
      })) as OnlineStore[];
    }),

  createStore: (data: CreateOnlineStoreRequest) =>
    apiClient.post<OnlineStore>('/online-store/stores', {
      storeName: data.name,
      slug: data.slug,
      description: data.description,
    }).then((r) => r.data),

  getStoreBySlug: (slug: string) =>
    apiClient.get<OnlineStore>(`/online-store/s/${slug}`).then((r) => r.data),

  // Customer storefront endpoints
  getStorefront: (slug: string) =>
    apiClient.get<Storefront>(`/online-store/s/${slug}/storefront`).then((r) => r.data),

  createOrder: (slug: string, data: CreateStorefrontOrderRequest) =>
    apiClient.post<StorefrontOrder>(`/online-store/s/${slug}/orders`, data).then((r) => r.data),
};
