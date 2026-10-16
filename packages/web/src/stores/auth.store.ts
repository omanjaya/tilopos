import { create } from 'zustand';
import type { AuthUser } from '@/types/auth.types';
import { useFeatureStore } from './feature.store';
import { useCartStore } from './cart.store';
import { useUIStore } from './ui.store';
import { destroySharedSocket } from '@/hooks/realtime/socket.util';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  sessionVersion: number;
  setAuth: (user: AuthUser, token: string) => void;
  updateUser: (user: AuthUser) => void;
  /**
   * Clear the session. Never deletes unsynced offline sales or held bills:
   * those stay on the device and sync when their owner logs in again.
   * Interactive logouts should use `requestLogout()` which asks first.
   */
  logout: () => void;
  isTokenExpired: () => boolean;
}

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch (error) {
    console.warn('[auth] stored user is corrupted; clearing session', error);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    return null;
  }
}

/** Decode a JWT segment (base64url, possibly unpadded) */
export function decodeJwtSegment(segment: string): unknown {
  let base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad === 2) base64 += '==';
  else if (pad === 3) base64 += '=';
  else if (pad === 1) throw new Error('Invalid base64url segment');
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** Remove everything the service worker / browser cached for this session */
async function clearBrowserCaches(): Promise<void> {
  if (typeof caches === 'undefined') return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

const initialUser = readStoredUser();
// Remove legacy bearer credentials, including on the first upgraded page load.
localStorage.removeItem('token');

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialUser,
  token: null,
  isAuthenticated: false,
  sessionVersion: 0,
  setAuth: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.removeItem('token');
    localStorage.removeItem('tilopos-pending-logout');
    // Held bills parked by another business on this device must not be shown
    if (user.businessId) useCartStore.getState().scopeHeldBillsToBusiness(user.businessId);
    set({ user, token, isAuthenticated: true, sessionVersion: get().sessionVersion + 1 });
  },
  updateUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    // Destroy WebSocket connection so it reconnects with fresh token on next login
    destroySharedSocket();
    // Private API responses possibly cached by an older service worker
    clearBrowserCaches().catch((error: unknown) => {
      console.warn('[auth] failed to clear Cache Storage on logout', error);
    });
    // Reset session state to prevent data leaking between sessions.
    // The active cart is cleared; held bills and the offline sales queue are kept.
    useCartStore.getState().clearCart();
    useFeatureStore.getState().setEnabledFeatures([]);
    useFeatureStore.getState().setRestrictedFeatures([]);
    useFeatureStore.getState().setCurrentOutletId(null);
    useUIStore.getState().resetBusinessSettings();
    set({ user: null, token: null, isAuthenticated: false, sessionVersion: get().sessionVersion + 1 });
  },
  isTokenExpired: () => {
    const token = get().token;
    if (!token) return true;
    try {
      const parts = token.split('.');
      if (parts.length < 2 || !parts[1]) return true;
      const payload = decodeJwtSegment(parts[1]) as { exp?: number };
      if (typeof payload.exp !== 'number') return false;
      return payload.exp * 1000 < Date.now();
    } catch {
      // Undecodable token is treated as expired (forces a fresh login)
      return true;
    }
  },
}));

/**
 * Interactive logout. If unsynced offline sales exist on this device the user is
 * asked to confirm; the sales are NOT deleted — they sync the next time the same
 * user logs in. Returns true when the user was logged out.
 */
export async function requestLogout(
  confirmFn: (message: string) => boolean = (message) => window.confirm(message),
): Promise<boolean> {
  let unsynced = 0;
  try {
    const { syncEngine } = await import('@/services/sync');
    // Last chance to push pending sales with the current session
    if (navigator.onLine) await syncEngine.processQueue();
    unsynced = await syncEngine.countUnsynced();
    if (unsynced === 0) await syncEngine.purgeIfEmpty();
  } catch (error) {
    // Could not read the queue: assume there may be unsynced sales
    console.warn('[auth] could not read offline queue before logout', error);
    unsynced = -1;
  }

  if (unsynced !== 0) {
    const detail =
      unsynced > 0
        ? `Masih ada ${unsynced} transaksi offline yang belum tersinkron.`
        : 'Status transaksi offline tidak dapat diperiksa.';
    const ok = confirmFn(
      `${detail} Transaksi tetap tersimpan di perangkat ini dan akan disinkronkan saat Anda login kembali. Tetap keluar?`,
    );
    if (!ok) return false;
  }

  const { revokeSession } = await import('@/api/session');
  try {
    await revokeSession();
  } catch {
    const { toast } = await import('@/lib/toast-utils');
    toast.error({ title: 'Belum berhasil keluar', description: 'Sesi server belum dicabut. Periksa koneksi lalu coba lagi.' });
    return false;
  }
  useAuthStore.getState().logout();
  if (!navigator.onLine) {
    const { toast } = await import('@/lib/toast-utils');
    toast.warning({ title: 'Keluar dari perangkat', description: 'Sesi server akan dicabut saat perangkat tersambung kembali.' });
  }
  return true;
}
