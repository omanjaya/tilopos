import { apiClient } from '../client';

export interface PriceTier {
  id: string;
  productId: string;
  tierName: string;
  minQuantity: number;
  maxQuantity: number | null;
  price: number;
  discountPercent: number | null;
  isActive: boolean;
}

export interface ResolvedPrice {
  unitPrice: number;
  tierName: string | null;
  originalPrice: number;
  savings: number;
  savingsPercent: number;
}

export const priceTiersApi = {
  listByProduct: (productId: string) =>
    apiClient.get<{ tiers: PriceTier[] }>(`/price-tiers/product/${productId}`).then((r) => r.data.tiers),

  create: (data: Omit<PriceTier, 'id' | 'isActive'>) =>
    apiClient.post<{ tier: PriceTier }>('/price-tiers', data).then((r) => r.data.tier),

  update: (id: string, data: Partial<PriceTier>) =>
    apiClient.put<{ tier: PriceTier }>(`/price-tiers/${id}`, data).then((r) => r.data.tier),

  delete: (id: string) => apiClient.delete(`/price-tiers/${id}`),

  bulkCreate: (productId: string, tiers: Omit<PriceTier, 'id' | 'productId' | 'isActive'>[]) =>
    apiClient.post<{ created: number }>(`/price-tiers/product/${productId}/bulk`, { tiers }).then((r) => r.data),

  resolvePrice: (productId: string, quantity: number) =>
    apiClient.get<ResolvedPrice>(`/price-tiers/resolve/${productId}?quantity=${quantity}`).then((r) => r.data),
};
