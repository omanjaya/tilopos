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

/** price / discountPercent are Prisma Decimals serialized as strings — convert once here. */
function mapTier(t: PriceTier): PriceTier {
  return {
    ...t,
    price: Number(t.price ?? 0),
    discountPercent: t.discountPercent == null ? null : Number(t.discountPercent),
  };
}

/** Writes are owner/manager only (PRICE_EDITORS). */
export const priceTiersApi = {
  /** Active tiers, ascending minQuantity. */
  listByProduct: (productId: string) =>
    apiClient
      .get<{ tiers: PriceTier[] }>(`/price-tiers/product/${productId}`)
      .then((r) => r.data.tiers.map(mapTier)),

  bulkCreate: (productId: string, tiers: Omit<PriceTier, 'id' | 'productId' | 'isActive'>[]) =>
    apiClient.post<{ created: number }>(`/price-tiers/product/${productId}/bulk`, { tiers }).then((r) => r.data),
};
