import { apiClient } from '../client';
import type {
  Promotion,
  CreatePromotionRequest,
  UpdatePromotionRequest,
  LoyaltyProgram,
  LoyaltyTier,
  GenerateVoucherRequest,
  GeneratedVoucher,
} from '@/types/promotion.types';

const BUSINESS_TZ = 'Asia/Jakarta';

/** 'YYYY-MM-DD' (business date) -> ISO timestamp of 00:00 WIB that day. */
export function businessDayStartIso(date: string): string {
  return new Date(`${date}T00:00:00.000+07:00`).toISOString();
}

/** 'YYYY-MM-DD' (business date) -> ISO timestamp of 23:59:59.999 WIB that day. */
export function businessDayEndIso(date: string): string {
  return new Date(`${date}T23:59:59.999+07:00`).toISOString();
}

/** ISO timestamp -> 'YYYY-MM-DD' in the business timezone (for date inputs). */
export function toBusinessDateInput(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: BUSINESS_TZ });
}

function toNullableNumber(v: unknown): number | null {
  return v !== null && v !== undefined ? Number(v) : null;
}

/** Prisma Decimals arrive as strings; normalize numeric fields. */
function normalizePromotion(p: Record<string, unknown>): Promotion {
  return {
    ...p,
    discountValue: Number(p.discountValue ?? 0),
    minPurchase: toNullableNumber(p.minPurchase),
    maxDiscount: toNullableNumber(p.maxDiscount),
    usageCount: Number(p.usageCount ?? p.usedCount ?? 0),
    usageLimit: toNullableNumber(p.usageLimit),
  } as Promotion;
}

export const promotionsApi = {
  /** GET /promotions takes no query params and returns active promotions only. */
  list: () =>
    apiClient.get<Array<Record<string, unknown>>>('/promotions').then((r) => {
      if (!Array.isArray(r.data)) {
        throw new Error('Format respons daftar promosi tidak valid');
      }
      return r.data.map(normalizePromotion);
    }),

  get: (id: string) =>
    apiClient
      .get<Record<string, unknown>>(`/promotions/${id}`)
      .then((r) => normalizePromotion(r.data)),

  create: (data: CreatePromotionRequest) =>
    apiClient.post<Promotion>('/promotions', data).then((r) => r.data),

  update: (id: string, data: UpdatePromotionRequest) =>
    apiClient.put<Promotion>(`/promotions/${id}`, data).then((r) => r.data),

  /** Soft delete: DELETE /promotions/:id deactivates the promotion. */
  delete: (id: string) =>
    apiClient.delete(`/promotions/${id}`).then((r) => r.data),

  /** GET /settings/loyalty returns { program: LoyaltyProgram | null, tiers }. */
  getLoyaltyProgram: () =>
    apiClient
      .get<{ program: LoyaltyProgram | null; tiers: LoyaltyTier[] }>('/settings/loyalty')
      .then((r): LoyaltyProgram | null => {
        const prog = r.data?.program;
        if (!prog) return null;
        return {
          ...prog,
          amountPerPoint: Number(prog.amountPerPoint) || 0,
          redemptionRate: Number(prog.redemptionRate) || 0,
        };
      }),

  createLoyaltyProgram: (data: {
    name: string;
    amountPerPoint: number;
    redemptionRate: number;
    pointExpiryDays?: number;
  }) =>
    apiClient.post<LoyaltyProgram>('/settings/loyalty', data).then((r) => r.data),

  updateLoyaltyProgram: (data: {
    name?: string;
    amountPerPoint?: number;
    redemptionRate?: number;
    pointExpiryDays?: number;
    isActive?: boolean;
  }) =>
    apiClient.put<LoyaltyProgram>('/settings/loyalty', data).then((r) => r.data),

  getLoyaltyTiers: () =>
    apiClient.get<LoyaltyTier[]>('/settings/loyalty/tiers').then((r) => r.data),

  // Voucher Generation
  generateVouchers: (data: GenerateVoucherRequest) =>
    apiClient.post<GeneratedVoucher[]>('/promotions/vouchers/generate', data).then((r) => r.data),
  listVouchers: (params?: { search?: string }) =>
    apiClient.get<GeneratedVoucher[]>('/promotions/vouchers', { params }).then((r) => r.data),
  exportVouchersCsv: () =>
    apiClient.get<Blob>('/promotions/vouchers/export', { responseType: 'blob' }).then((r) => r.data),
};
