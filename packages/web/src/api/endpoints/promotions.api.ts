import { apiClient } from '../client';
import type {
  Promotion,
  CreatePromotionRequest,
  LoyaltyProgram,
  LoyaltyTier,
  GenerateVoucherRequest,
  GeneratedVoucher,
  LoyaltyAnalytics,
  LoyaltyTopCustomer,
  LoyaltyTierDistribution,
  LoyaltyActivityItem,
} from '@/types/promotion.types';

export const promotionsApi = {
  list: (params?: { search?: string }) =>
    apiClient.get('/promotions', { params }).then((r) => {
      const raw = r.data;
      const arr = (Array.isArray(raw) ? raw : []) as Array<Record<string, unknown>>;
      // Backend may return Decimal objects; normalize numeric fields
      return arr.map((p) => ({
        ...p,
        discountValue: Number(p.discountValue ?? 0),
        minPurchase: p.minPurchase !== null && p.minPurchase !== undefined ? Number(p.minPurchase) : null,
        maxDiscount: p.maxDiscount !== null && p.maxDiscount !== undefined ? Number(p.maxDiscount) : null,
        usageCount: Number(p.usageCount ?? p.usedCount ?? 0),
        usageLimit: p.usageLimit !== null && p.usageLimit !== undefined ? Number(p.usageLimit) : null,
      })) as Promotion[];
    }),

  get: (id: string) =>
    apiClient.get<Promotion>(`/promotions/${id}`).then((r) => r.data),

  create: (data: CreatePromotionRequest) =>
    apiClient.post<Promotion>('/promotions', data).then((r) => r.data),

  update: (id: string, data: Partial<CreatePromotionRequest>) =>
    apiClient.put<Promotion>(`/promotions/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/promotions/${id}`).then((r) => r.data),

  validateVoucher: (code: string) =>
    apiClient.post('/promotions/vouchers/validate', { code }).then((r) => r.data),

  getLoyaltyProgram: () =>
    apiClient.get<{ program: LoyaltyProgram } | LoyaltyProgram>('/settings/loyalty').then((r) => {
      const data = r.data as Record<string, unknown>;
      // API returns { program: {...}, tiers: [...] } wrapper
      const prog = (data.program ?? data) as Record<string, unknown>;
      return {
        ...prog,
        amountPerPoint: Number(prog.amountPerPoint) || 0,
        redemptionRate: Number(prog.redemptionRate) || 0,
      } as LoyaltyProgram;
    }),

  createLoyaltyProgram: (data: {
    name: string;
    amountPerPoint: number;
    redemptionRate: number;
    pointExpiryDays?: number;
  }) =>
    apiClient.post<LoyaltyProgram>('/settings/loyalty', data).then((r) => r.data),

  getLoyaltyTiers: () =>
    apiClient.get<LoyaltyTier[]>('/settings/loyalty/tiers').then((r) => r.data),

  // Voucher Generation
  generateVouchers: (data: GenerateVoucherRequest) =>
    apiClient.post<GeneratedVoucher[]>('/promotions/vouchers/generate', data).then((r) => r.data),
  listVouchers: (params?: { search?: string }) =>
    apiClient.get<GeneratedVoucher[]>('/promotions/vouchers', { params }).then((r) => r.data),
  exportVouchersCsv: () =>
    apiClient.get<Blob>('/promotions/vouchers/export', { responseType: 'blob' }).then((r) => r.data),

  // Loyalty Analytics
  getLoyaltyAnalytics: () =>
    apiClient.get('/loyalty/analytics').then((r) => {
      const d = r.data as Record<string, unknown>;
      return {
        totalMembers: Number(d.totalMembers ?? 0),
        activeMembers: Number(d.activeMembers ?? 0),
        totalPointsIssued: Number(d.totalPointsIssued ?? 0),
        totalPointsRedeemed: Number(d.totalPointsRedeemed ?? 0),
        redemptionRate: Number(d.redemptionRate ?? 0),
        topCustomers: Array.isArray(d.topCustomers) ? (d.topCustomers as LoyaltyTopCustomer[]) : [],
        tierDistribution: Array.isArray(d.tierDistribution) ? (d.tierDistribution as LoyaltyTierDistribution[]) : [],
        recentActivity: Array.isArray(d.recentActivity) ? (d.recentActivity as LoyaltyActivityItem[]) : [],
      } as LoyaltyAnalytics;
    }),
};
