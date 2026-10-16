import { apiClient } from '../client';

/** POST /onboarding/setup body (backend GuidedSetupDto). */
export interface GuidedSetupRequest {
  business?: { name?: string; phone?: string; address?: string };
  businessType?: string;
  template?: {
    sections: {
      categories?: boolean;
      products?: boolean;
      modifiers?: boolean;
      tables?: boolean;
      units?: boolean;
    };
  };
  /** Wizard ids (cash, qris, debit, credit, transfer, ewallet); mapped to types by the backend. */
  paymentMethods?: string[];
  taxRate?: number;
  employee?: { name: string; email?: string; pin: string };
}

/** onboarding.service.ts GuidedSetupResult */
export interface GuidedSetupResult {
  business: { updated: boolean };
  businessType: { set: boolean; type: string | null; featuresEnabled: number };
  template: {
    applied: boolean;
    categories: number;
    products: number;
    modifierGroups: number;
    modifiers: number;
    tables: number;
  };
  paymentMethods: { configured: boolean; count: number };
  employee: { created: boolean; id: string | null };
  onboarding: { completed: boolean };
}

export const onboardingApi = {
  setup: (data: GuidedSetupRequest) =>
    apiClient.post<GuidedSetupResult>('/onboarding/setup', data).then((r) => r.data),
};
