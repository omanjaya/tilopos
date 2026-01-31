import { apiClient } from '../client';
import type {
  LoginRequest,
  LoginResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  ChangePinRequest,
  ChangePinResponse,
  ActivityLogResponse,
  AuthUser,
} from '@/types/auth.types';

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', data).then((r) => r.data),

  getMe: () =>
    apiClient.get<AuthUser>('/auth/me').then((r) => r.data),

  updateProfile: (data: UpdateProfileRequest) =>
    apiClient.patch<UpdateProfileResponse>('/auth/profile', data).then((r) => r.data),

  changePin: (data: ChangePinRequest) =>
    apiClient.put<ChangePinResponse>('/auth/change-pin', data).then((r) => r.data),

  getActivityLog: (params: { page?: number; limit?: number } = {}) =>
    apiClient.get<ActivityLogResponse>('/auth/activity', { params }).then((r) => r.data),
};
