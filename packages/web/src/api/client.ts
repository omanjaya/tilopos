import { refreshSession, SessionChangedError } from './session';
import axios, { type AxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/lib/toast-utils';
import { markErrorHandled, getErrorMessage } from '@/lib/api-error-handler';
import type { ApiErrorResponse } from '@/types/api.types';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Skip global toasts and the 401 logout (e.g. background offline sync) */
    skipGlobalErrorHandler?: boolean;
    sessionRetried?: boolean;
    /** Bind queued mutations to their original operator across refresh/login. */
    ownerUserId?: string;
    sessionUserId?: string;
  }
}

// Flag to prevent multiple concurrent 401 handlers from triggering multiple logout
let isLoggingOut = false;

/**
 * Auth endpoints that answer 401 for bad credentials (wrong PIN/password, MFA code,
 * change-pin). Such a 401 is a form error, not an expired session.
 * All /auth/* failures remain local to their caller.
 */
export function isCredentialEndpoint(url: string | undefined): boolean {
  if (!url) return false;
  const path = url
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^\/api\/v1/, '')
    .replace(/^\//, '');
  return path.startsWith('auth/');
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000, // 30 seconds
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', 'X-TiloPOS-Session': '1' },
});

apiClient.interceptors.request.use(async (config) => {
  let state = useAuthStore.getState();
  config.sessionUserId ??= state.user?.id;
  if (config.ownerUserId && config.ownerUserId !== state.user?.id) {
    throw new SessionChangedError('Offline sale belongs to another operator');
  }
  // Refresh before sending expired tokens, including authenticated /auth routes.
  // Explicit Authorization is used by the login flow before setAuth().
  const protectedAuthPath =
    /^\/?auth\/(me|activity|profile|change-pin|complete-onboarding|send-verification-email|mfa\/(setup|enable|disable))(\b|\/|\?|$)/.test(
      config.url ?? '',
    );
  if (
    (!isCredentialEndpoint(config.url) || protectedAuthPath) &&
    !config.headers.Authorization &&
    state.isAuthenticated &&
    state.isTokenExpired() &&
    navigator.onLine
  ) {
    try {
      await refreshSession();
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 401 &&
        !config.skipGlobalErrorHandler
      ) {
        useAuthStore.getState().logout();
        toast.warning({ title: 'Sesi berakhir', description: 'Silakan login kembali' });
        markErrorHandled(error);
      }
      throw error;
    }
    state = useAuthStore.getState();
  }
  if (config.sessionUserId && state.user?.id !== config.sessionUserId) {
    throw new SessionChangedError('Session changed before request');
  }
  if (!config.headers.Authorization && state.token)
    config.headers.Authorization = `Bearer ${state.token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;

    const config = error.config;
    if (status === 401 && config && !isCredentialEndpoint(config.url)) {
      const before = useAuthStore.getState();
      if (config.sessionUserId && before.user?.id !== config.sessionUserId)
        return Promise.reject(error);
      if (!config.sessionRetried) {
        config.sessionRetried = true;
        try {
          // A late 401 from the old token can reuse the already-refreshed token.
          const sent = config.headers.Authorization;
          const token =
            before.token && sent !== `Bearer ${before.token}`
              ? before.token
              : await refreshSession();
          if (config.sessionUserId && useAuthStore.getState().user?.id !== config.sessionUserId)
            throw new SessionChangedError('Session changed');
          config.headers.Authorization = `Bearer ${token}`;
          return apiClient.request(config);
        } catch (refreshError) {
          // A network/5xx refresh failure is not an invalid session; keep offline
          // work and surface the failure without deleting the local identity.
          if (!axios.isAxiosError(refreshError) || refreshError.response?.status !== 401)
            return Promise.reject(refreshError);
        }
      }
      if (!config.skipGlobalErrorHandler && !isLoggingOut) {
        isLoggingOut = true;
        useAuthStore.getState().logout();
        toast.warning({ title: 'Sesi berakhir', description: 'Silakan login kembali' });
        queueMicrotask(() => {
          isLoggingOut = false;
        });
      }
      markErrorHandled(error);
      return Promise.reject(error);
    }

    if (config?.skipGlobalErrorHandler) return Promise.reject(error);

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
