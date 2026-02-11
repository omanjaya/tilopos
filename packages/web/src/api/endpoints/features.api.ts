import { apiClient } from '../client';

export interface BusinessFeatureDto {
  key: string;
  label: string;
  description: string;
  category: 'sales' | 'inventory' | 'marketing' | 'service' | 'advanced';
  isEnabled: boolean;
  dependencies?: string[];
  icon?: string;
}

export interface BusinessTypePreset {
  code: string;
  label: string;
  description: string;
  icon: string;
  category: 'fnb' | 'retail' | 'service' | 'wholesale' | 'custom';
  examples: string[];
  defaultFeatures: string[];
  optionalFeatures: string[];
}

export interface BusinessTypeInfo {
  code: string;
  label: string;
  description: string;
  icon: string;
  category: string;
  examples: string[];
  setAt?: string;
}

export interface ToggleFeatureResponse {
  success: boolean;
  featureKey: string;
  isEnabled: boolean;
  message?: string;
  affectedFeatures?: string[];
}

export interface ChangeTypeResponse {
  success: boolean;
  previousType: string;
  newType: string;
  featuresEnabled: number;
}

export const featuresApi = {
  // Feature endpoints (business-level, legacy)
  getFeatures: () =>
    apiClient.get<{ features: BusinessFeatureDto[] }>('/business/features').then((r) => r.data.features),

  getEnabledFeatures: () =>
    apiClient.get<{ features: string[] }>('/business/features/enabled').then((r) => r.data.features),

  getFeaturesByCategory: () =>
    apiClient
      .get<Record<string, BusinessFeatureDto[]>>('/business/features/by-category')
      .then((r) => r.data),

  toggleFeature: (featureKey: string, isEnabled: boolean) =>
    apiClient
      .put<ToggleFeatureResponse>(`/business/features/${featureKey}`, { isEnabled })
      .then((r) => r.data),

  bulkUpdateFeatures: (features: { key: string; enabled: boolean }[]) =>
    apiClient
      .put<{ success: boolean; updated: number; errors: string[] }>('/business/features/bulk', { features })
      .then((r) => r.data),

  getFeatureRegistry: () =>
    apiClient
      .get<{ features: BusinessFeatureDto[]; total: number }>('/business/features/registry')
      .then((r) => r.data),

  // Business type endpoints
  getBusinessType: () =>
    apiClient
      .get<{ businessType: BusinessTypeInfo | null; hasSetType: boolean; recommendation?: string | null }>(
        '/business/type',
      )
      .then((r) => r.data),

  changeBusinessType: (businessType: string) =>
    apiClient.put<ChangeTypeResponse>('/business/type', { businessType }).then((r) => r.data),

  getTypePresets: () =>
    apiClient
      .get<{ presets: BusinessTypePreset[]; grouped: Record<string, BusinessTypePreset[]> }>(
        '/business/types/presets',
      )
      .then((r) => r.data),

  validateTypeCode: (code: string) =>
    apiClient.get<{ valid: boolean }>(`/business/types/validate/${code}`).then((r) => r.data),

  // Outlet-level feature endpoints
  getOutletFeatures: (outletId: string) =>
    apiClient.get<{ features: BusinessFeatureDto[] }>(`/outlet/${outletId}/features`).then((r) => r.data.features),

  getOutletEnabledFeatures: (outletId: string) =>
    apiClient.get<{ features: string[] }>(`/outlet/${outletId}/features/enabled`).then((r) => r.data.features),

  toggleOutletFeature: (outletId: string, featureKey: string, isEnabled: boolean) =>
    apiClient
      .put<ToggleFeatureResponse>(`/outlet/${outletId}/features/${featureKey}`, { isEnabled })
      .then((r) => r.data),

  getOutletType: (outletId: string) =>
    apiClient
      .get<{ outletType: BusinessTypeInfo | null }>(`/outlet/${outletId}/type`)
      .then((r) => r.data),

  changeOutletType: (outletId: string, outletType: string) =>
    apiClient.put<ChangeTypeResponse>(`/outlet/${outletId}/type`, { outletType }).then((r) => r.data),
};
