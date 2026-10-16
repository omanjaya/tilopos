import { apiClient } from '../client';
import type {
  LoginRequest,
  LoginResult,
  MfaVerifyResponse,
  MeResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  ChangePinRequest,
  ChangePinResponse,
  ActivityLogResponse,
} from '@/types/auth.types';
import type {
  RegisterRequest,
  RegisterResponse,
  BusinessTypePresetPublic,
} from '@/types/register.types';

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResult>('/auth/login', data).then((r) => r.data),

  /** Second login step for MFA-enabled accounts. */
  verifyMfa: (data: { mfaToken: string; token: string }) =>
    apiClient.post<MfaVerifyResponse>('/auth/mfa/verify', data).then((r) => r.data),

  register: (data: RegisterRequest) =>
    apiClient.post<RegisterResponse>('/auth/register', data).then((r) => r.data),

  getBusinessTypePresets: () =>
    apiClient
      .get<{ presets: BusinessTypePresetPublic[]; grouped: Record<string, BusinessTypePresetPublic[]> }>(
        '/auth/business-type-presets',
      )
      .then((r) => r.data),

  /** `accessToken` lets callers load the profile right after login, before the store holds the token. */
  getMe: (accessToken?: string) =>
    apiClient
      .get<MeResponse>(
        '/auth/me',
        accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
      )
      .then((r) => r.data),

  updateProfile: (data: UpdateProfileRequest) =>
    apiClient.patch<UpdateProfileResponse>('/auth/profile', data).then((r) => r.data),

  changePin: (data: ChangePinRequest) =>
    apiClient.put<ChangePinResponse>('/auth/change-pin', data).then((r) => r.data),

  getActivityLog: (params: { page?: number; limit?: number } = {}) =>
    apiClient.get<ActivityLogResponse>('/auth/activity', { params }).then((r) => r.data),

  completeOnboarding: () =>
    apiClient.post<{ success: boolean; message: string }>('/auth/complete-onboarding').then((r) => r.data),

  sendVerificationEmail: () =>
    apiClient.post<{ success: boolean; message: string }>('/auth/send-verification-email').then((r) => r.data),

  verifyEmail: (token: string) =>
    apiClient.get<{ success: boolean; message: string }>('/auth/verify-email', { params: { token } }).then((r) => r.data),
};
