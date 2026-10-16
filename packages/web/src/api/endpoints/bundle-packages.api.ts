import { apiClient } from '@/api/client';
import type { BundlePackage, CreateBundleRequest, UpdateBundleRequest } from '@/types/bundle.types';

/**
 * Prisma Decimal fields (price, costPrice, items[].quantity) are serialized as
 * strings; convert them so the form re-submits numbers (UpdateBundlePackageDto
 * uses @IsNumber()).
 */
function normalizeBundle(b: BundlePackage): BundlePackage {
  return {
    ...b,
    price: Number(b.price ?? 0),
    costPrice: b.costPrice !== null && b.costPrice !== undefined ? Number(b.costPrice) : null,
    items: (b.items ?? []).map((item) => ({ ...item, quantity: Number(item.quantity) })),
    outlets: b.outlets ?? [],
  };
}

function normalizeList(data: unknown): BundlePackage[] {
  if (!Array.isArray(data)) {
    throw new Error('Format respons paket bundle tidak valid');
  }
  return (data as BundlePackage[]).map(normalizeBundle);
}

export const bundlePackagesApi = {
  /** GET /bundle-packages — owner/manager/supervisor; plain array (default page size server-side, max 200). */
  list: (params?: { search?: string; isActive?: boolean; page?: number; limit?: number }) =>
    apiClient.get<BundlePackage[]>('/bundle-packages', { params }).then((r) => normalizeList(r.data)),

  get: (id: string) =>
    apiClient.get<BundlePackage>(`/bundle-packages/${id}`).then((r) => normalizeBundle(r.data)),

  create: (data: CreateBundleRequest) =>
    apiClient.post<BundlePackage>('/bundle-packages', data).then((r) => normalizeBundle(r.data)),

  update: (id: string, data: UpdateBundleRequest) =>
    apiClient.put<BundlePackage>(`/bundle-packages/${id}`, data).then((r) => normalizeBundle(r.data)),

  delete: (id: string) =>
    apiClient.delete(`/bundle-packages/${id}`),

  getForPOS: (outletId: string) =>
    apiClient
      .get<BundlePackage[]>(`/bundle-packages/pos/${outletId}`)
      .then((r) => normalizeList(r.data)),
};
