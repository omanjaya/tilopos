import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { apiClient, isCredentialEndpoint } from './client';
import { refreshSession, sessionClient, restoreSession } from './session';
import { useAuthStore } from '@/stores/auth.store';

const user = {
  id: 'u',
  employeeId: 'u',
  name: 'Cashier',
  email: null,
  role: 'cashier' as const,
  businessId: 'b',
  outletId: 'o',
};
const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200) => ({
  config,
  data,
  status,
  statusText: '',
  headers: new AxiosHeaders(),
});
const fail = (config: InternalAxiosRequestConfig, status: number) =>
  new AxiosError('failed', 'ERR_BAD_RESPONSE', config, undefined, response(config, {}, status));
let rotations = 0;
beforeEach(() => {
  rotations = 0;
  localStorage.clear();
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  useAuthStore.getState().setAuth(user, 'old');
  sessionClient.defaults.adapter = async (config) => {
    if (config.url === '/auth/refresh') {
      rotations++;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return response(config, { accessToken: 'fresh', employeeId: 'u', outletId: 'o' });
    }
    return response(config, { ...user, outletName: 'Main', onboardingCompleted: true });
  };
});

describe('cookie session', () => {
  it('shares one in-flight refresh and never persists access credentials', async () => {
    const tokens = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);
    expect(tokens).toEqual(['fresh', 'fresh', 'fresh']);
    expect(rotations).toBe(1);
    expect(localStorage.getItem('token')).toBeNull();
    expect(sessionClient.defaults.withCredentials).toBe(true);
  });
  it('retries concurrent 401s after one rotation', async () => {
    // An undecodable old token would trigger preflight refresh instead.
    useAuthStore.setState({ token: `h.${btoa(JSON.stringify({ exp: 9999999999 }))}.s` });
    apiClient.defaults.adapter = async (config) => {
      if (config.headers.Authorization !== 'Bearer fresh') throw fail(config, 401);
      return response(config, { ok: true });
    };
    await Promise.all([apiClient.get('/products'), apiClient.get('/outlets')]);
    expect(rotations).toBe(1);
  });
  it('never retries or globally logs out for /auth/* 401s', async () => {
    useAuthStore.setState({ token: `h.${btoa(JSON.stringify({ exp: 9999999999 }))}.s` });
    apiClient.defaults.adapter = async (config) => {
      throw fail(config, 401);
    };
    await expect(apiClient.post('/auth/login')).rejects.toBeInstanceOf(AxiosError);
    expect(rotations).toBe(0);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(isCredentialEndpoint('/api/v1/auth/me')).toBe(true);
  });
  it('does not revive a session logged out during refresh', async () => {
    const pending = refreshSession();
    useAuthStore.getState().logout();
    await expect(pending).rejects.toThrow('Session changed');
    expect(useAuthStore.getState().token).toBeNull();
  });
  it('does not submit an offline sale if the cookie changed to another user', async () => {
    sessionClient.defaults.adapter = async (config) =>
      response(config, { accessToken: 'other', employeeId: 'other' });
    await expect(apiClient.post('/pos/checkout', {}, { ownerUserId: 'u' })).rejects.toThrow(
      'different account',
    );
    expect(useAuthStore.getState().token).toBeNull();
  });
  it('retains offline identity on a network failure without a token', async () => {
    useAuthStore.setState({ token: null, isAuthenticated: false });
    sessionClient.defaults.adapter = async (config) => {
      throw new AxiosError('offline', axios.AxiosError.ERR_NETWORK, config);
    };
    await restoreSession();
    expect(useAuthStore.getState().user?.id).toBe('u');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().token).toBeNull();
  });
  it('ends an expired foreground session if refresh is rejected before the request', async () => {
    sessionClient.defaults.adapter = async (config) => {
      throw fail(config, 401);
    };
    await expect(apiClient.get('/products')).rejects.toBeInstanceOf(AxiosError);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
  it('keeps queued sales and local identity when background refresh is rejected', async () => {
    localStorage.setItem('tilopos-offline-queue', '[{"id":"sale"}]');
    sessionClient.defaults.adapter = async (config) => {
      throw fail(config, 401);
    };
    await expect(
      apiClient.post('/pos/transactions', {}, { skipGlobalErrorHandler: true, ownerUserId: 'u' }),
    ).rejects.toBeInstanceOf(AxiosError);
    expect(localStorage.getItem('tilopos-offline-queue')).toBe('[{"id":"sale"}]');
    expect(useAuthStore.getState().user?.id).toBe('u');
  });
});
