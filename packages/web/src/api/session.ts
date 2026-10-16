import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import { meToAuthUser } from '@/features/auth/auth-user';
import type { MeResponse, MfaVerifyResponse } from '@/types/auth.types';

// Separate client prevents a refresh failure from recursively refreshing itself.
export const sessionClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json', 'X-TiloPOS-Session': '1' },
});
let inFlight: Promise<string> | null = null;

export class SessionChangedError extends Error {}

export function refreshSession(): Promise<string> {
  if (inFlight) return inFlight;
  const version = useAuthStore.getState().sessionVersion;
  const expectedUser = useAuthStore.getState().user?.id;
  const run = async () => {
    const { data } = await sessionClient.post<MfaVerifyResponse>('/auth/refresh');
    if (useAuthStore.getState().sessionVersion !== version)
      throw new SessionChangedError('Session changed');
    if (expectedUser && expectedUser !== data.employeeId) {
      // Another tab signed in as a different person. Never replay the old
      // user's mutation or offline sale with the new cookie's identity.
      useAuthStore.getState().logout();
      throw new SessionChangedError('A different account is signed in');
    }
    const { data: me } = await sessionClient.get<MeResponse>('/auth/me', {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    if (useAuthStore.getState().sessionVersion !== version)
      throw new SessionChangedError('Session changed');
    const user = meToAuthUser(me, useAuthStore.getState().user);
    // /auth/me reflects the assigned outlet; refresh preserves the selected one.
    user.outletId = data.outletId;
    if (me.outletId !== data.outletId) user.outletName = undefined;
    useAuthStore.getState().setAuth(user, data.accessToken);
    return data.accessToken;
  };
  // Cookies are shared by tabs. Serialize their rotations as well as requests
  // inside this tab; raw refresh credentials never leave the browser cookie jar.
  inFlight = (async () => {
    if (typeof navigator.locks?.request === 'function') {
      return await navigator.locks.request('tilopos-session-refresh', run);
    }
    return run();
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export async function restoreSession(): Promise<void> {
  if (!navigator.onLine && useAuthStore.getState().user) {
    useAuthStore.setState({ isAuthenticated: true });
    return;
  }
  try {
    // An offline logout records intent because JavaScript cannot delete an
    // httpOnly cookie. Revoke it before any subsequent refresh on reconnect.
    if (localStorage.getItem('tilopos-pending-logout')) {
      await sessionClient.post('/auth/logout');
      localStorage.removeItem('tilopos-pending-logout');
      useAuthStore.getState().logout();
      return;
    }
    await refreshSession();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      useAuthStore.getState().logout();
    } else if (useAuthStore.getState().user && !(error instanceof SessionChangedError)) {
      // No reachable server: retain the local operator identity for offline
      // checkout. This grants no server access; there is no persisted token.
      useAuthStore.setState({ isAuthenticated: true });
      console.warn('[auth] session recovery unavailable; offline mode retained', error);
    }
  }
}

export async function revokeSession(): Promise<void> {
  localStorage.setItem('tilopos-pending-logout', '1');
  // Invalidate any refresh response that is already in flight.
  useAuthStore.setState((state) => ({ sessionVersion: state.sessionVersion + 1 }));
  if (!navigator.onLine) return;
  try {
    // Wait for rotation so logout revokes the most recent cookie.
    if (inFlight)
      await inFlight.catch((error: unknown) =>
        console.warn('[auth] refresh interrupted by logout', error),
      );
    await sessionClient.post('/auth/logout');
    localStorage.removeItem('tilopos-pending-logout');
  } catch (error) {
    console.warn('[auth] server logout pending until connectivity recovers', error);
    throw error;
  }
}
