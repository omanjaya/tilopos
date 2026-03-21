import axios, { type AxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/lib/toast-utils';
import { markErrorHandled, getErrorMessage } from '@/lib/api-error-handler';
import type { ApiErrorResponse } from '@/types/api.types';

// Flag to prevent multiple concurrent 401 handlers from triggering multiple logout
let isLoggingOut = false;

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000, // 30 seconds
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // 401 Unauthorized — logout
    if (status === 401) {
      if (!isLoggingOut) {
        isLoggingOut = true;
        toast.warning({
          title: 'Sesi berakhir',
          description: 'Silakan login kembali',
        });
        setTimeout(() => {
          useAuthStore.getState().logout();
          window.location.href = '/login';
          isLoggingOut = false;
        }, 2000);
      }
      markErrorHandled(error);
      return Promise.reject(error);
    }

    // 403 Forbidden
    if (status === 403) {
      const { title, description } = getErrorMessage(error);
      toast.error({ title, description });
      markErrorHandled(error);
      return Promise.reject(error);
    }

    // 429 Rate limit
    if (status === 429) {
      const { title, description } = getErrorMessage(error);
      toast.warning({ title, description });
      markErrorHandled(error);
      return Promise.reject(error);
    }

    // 500+ Server errors
    if (status && status >= 500) {
      const { title, description } = getErrorMessage(error);
      toast.error({ title, description });
      markErrorHandled(error);
      return Promise.reject(error);
    }

    // Network / timeout errors (no response)
    if (!error.response) {
      const { title, description } = getErrorMessage(error as AxiosError<ApiErrorResponse>);
      toast.error({ title, description });
      markErrorHandled(error);
      return Promise.reject(error);
    }

    // 400, 404, 409, 422, etc. — pass through to mutation-level handlers
    return Promise.reject(error);
  },
);
