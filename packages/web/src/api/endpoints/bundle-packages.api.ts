import { apiClient } from '@/api/client';
import type { BundlePackage, CreateBundleRequest, UpdateBundleRequest } from '@/types/bundle.types';

export const bundlePackagesApi = {
  list: (params?: { search?: string; isActive?: string }) =>
    apiClient.get<BundlePackage[]>('/bundle-packages', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<BundlePackage>(`/bundle-packages/${id}`).then((r) => r.data),

  create: (data: CreateBundleRequest) =>
    apiClient.post<BundlePackage>('/bundle-packages', data).then((r) => r.data),

  update: (id: string, data: UpdateBundleRequest) =>
    apiClient.put<BundlePackage>(`/bundle-packages/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/bundle-packages/${id}`),

  getForPOS: (outletId: string) =>
    apiClient.get<BundlePackage[]>(`/bundle-packages/pos/${outletId}`).then((r) => r.data),
};
