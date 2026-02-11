import { create } from 'zustand';
import type { AuthUser } from '@/types/auth.types';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => void;
  isTokenExpired: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  setAuth: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true });
  },
  updateUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('tilo-pos-cart');
    localStorage.removeItem('selectedOutletId');
    localStorage.removeItem('tilopos-offline-queue');
    // Clear IndexedDB offline transaction queue
    try { indexedDB.deleteDatabase('tilopos-sync'); } catch { /* ignore */ }
    set({ user: null, token: null, isAuthenticated: false });
  },
  isTokenExpired: () => {
    const token = get().token;
    if (!token) return true;
    try {
      const parts = token.split('.');
      if (parts.length < 2 || !parts[1]) return true;
      const payload = JSON.parse(atob(parts[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  },
}));
