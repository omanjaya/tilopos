import { apiClient } from '../client';
import type { OnlineStore, CreateOnlineStoreRequest } from '@/types/online-store.types';

export const onlineStoreApi = {
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
};
