import { apiClient } from '../client';
import type {
  SubscriptionInfo,
  SubscriptionInvoice,
  UpgradeResult,
  CreateUpgradeRequest,
  CancelSubscriptionRequest,
} from '@/types/subscription.types';

export const subscriptionApi = {
  get: () =>
    apiClient.get<SubscriptionInfo>('/subscription').then((r) => r.data),

  upgrade: (data: CreateUpgradeRequest) =>
    apiClient.post<UpgradeResult>('/subscription/upgrade', data).then((r) => r.data),

  cancel: (data?: CancelSubscriptionRequest) =>
    apiClient.post<{ message: string }>('/subscription/cancel', data || {}).then((r) => r.data),

  invoices: () =>
    apiClient.get<SubscriptionInvoice[]>('/subscription/invoices').then((r) => r.data),
};
