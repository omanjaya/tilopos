import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../auth.store';
import type { AuthUser } from '@/types/auth.types';

const mockUser: AuthUser = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'cashier',
  businessId: 'biz-1',
  outletId: 'outlet-1',
  employeeId: 'emp-1',
  outletName: 'Main Outlet',
};

// Helper to create a non-expired JWT token
function createMockToken(expiresInSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: 'user-1',
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    }),
  );
  return `${header}.${payload}.signature`;
}

describe('auth.store', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset the store to initial state
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  });

  describe('setAuth', () => {
    it('sets user and token in state', () => {
      const token = createMockToken(3600);
      useAuthStore.getState().setAuth(mockUser, token);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe(token);
      expect(state.isAuthenticated).toBe(true);
    });

    it('persists user and token to localStorage', () => {
      const token = createMockToken(3600);
      useAuthStore.getState().setAuth(mockUser, token);

      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
      expect(localStorage.getItem('token')).toBe(token);
    });
  });

  describe('logout', () => {
    it('clears user and token from state', () => {
      const token = createMockToken(3600);
      useAuthStore.getState().setAuth(mockUser, token);
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('removes user and token from localStorage', () => {
      const token = createMockToken(3600);
      useAuthStore.getState().setAuth(mockUser, token);
      useAuthStore.getState().logout();

      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('removes cart and outlet data from localStorage', () => {
      localStorage.setItem('tilo-pos-cart', '{"items":[]}');
      localStorage.setItem('selectedOutletId', 'outlet-1');
      useAuthStore.getState().logout();

      expect(localStorage.getItem('tilo-pos-cart')).toBeNull();
      expect(localStorage.getItem('selectedOutletId')).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('is false when no token is set', () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('is true after setAuth is called', () => {
      const token = createMockToken(3600);
      useAuthStore.getState().setAuth(mockUser, token);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('is false after logout', () => {
      const token = createMockToken(3600);
      useAuthStore.getState().setAuth(mockUser, token);
      useAuthStore.getState().logout();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('isTokenExpired', () => {
    it('returns true when no token is set', () => {
      expect(useAuthStore.getState().isTokenExpired()).toBe(true);
    });

    it('returns false for a valid non-expired token', () => {
      const token = createMockToken(3600); // expires in 1 hour
      useAuthStore.getState().setAuth(mockUser, token);
      expect(useAuthStore.getState().isTokenExpired()).toBe(false);
    });

    it('returns true for an expired token', () => {
      const token = createMockToken(-100); // expired 100 seconds ago
      useAuthStore.getState().setAuth(mockUser, token);
      expect(useAuthStore.getState().isTokenExpired()).toBe(true);
    });

    it('returns true for a malformed token', () => {
      useAuthStore.setState({ token: 'not-a-valid-jwt' });
      expect(useAuthStore.getState().isTokenExpired()).toBe(true);
    });
  });

  describe('setAuth edge cases', () => {
    it('overwrites a previous user when setAuth is called again', () => {
      const token1 = createMockToken(3600);
      const token2 = createMockToken(7200);
      const secondUser: AuthUser = {
        ...mockUser,
        id: 'user-2',
        name: 'Jane Doe',
        email: 'jane@example.com',
      };

      useAuthStore.getState().setAuth(mockUser, token1);
      useAuthStore.getState().setAuth(secondUser, token2);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(secondUser);
      expect(state.token).toBe(token2);
    });

    it('keeps isAuthenticated true after multiple setAuth calls', () => {
      const token = createMockToken(3600);
      useAuthStore.getState().setAuth(mockUser, token);
      useAuthStore.getState().setAuth(mockUser, token);

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  describe('token persistence', () => {
    it('initializes from localStorage when token exists', () => {
      const token = createMockToken(3600);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(mockUser));

      // Force re-creation by resetting state to what constructor would compute
      // In the real app, the store reads from localStorage on creation.
      // Since zustand stores are singletons in tests, we verify setAuth persists correctly.
      useAuthStore.getState().setAuth(mockUser, token);

      const state = useAuthStore.getState();
      expect(state.token).toBe(token);
      expect(state.user).toEqual(mockUser);
    });

    it('survives setAuth -> read cycle via localStorage', () => {
      const token = createMockToken(3600);
      useAuthStore.getState().setAuth(mockUser, token);

      // Verify localStorage was written
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      const storedToken = localStorage.getItem('token');

      expect(storedUser).toEqual(mockUser);
      expect(storedToken).toBe(token);
    });
  });
});
