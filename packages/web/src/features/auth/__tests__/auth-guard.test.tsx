import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthGuard } from '../auth-guard';
import { useAuthStore } from '@/stores/auth.store';

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

function renderWithRouter(initialEntry = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <AuthGuard>
              <div>Protected Content</div>
            </AuthGuard>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AuthGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  });

  it('redirects to /login when not authenticated', () => {
    renderWithRouter();

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated with valid token', () => {
    const token = createMockToken(3600);
    useAuthStore.setState({
      user: {
        id: 'user-1',
        name: 'John',
        email: 'john@test.com',
        role: 'cashier',
        businessId: 'biz-1',
        outletId: 'outlet-1',
        employeeId: 'emp-1',
      },
      token,
      isAuthenticated: true,
    });

    renderWithRouter();

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('redirects to /login when token is expired', () => {
    const expiredToken = createMockToken(-100);
    useAuthStore.setState({
      user: {
        id: 'user-1',
        name: 'John',
        email: 'john@test.com',
        role: 'cashier',
        businessId: 'biz-1',
        outletId: 'outlet-1',
        employeeId: 'emp-1',
      },
      token: expiredToken,
      isAuthenticated: true,
    });

    renderWithRouter();

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('cleans up auth state when token is expired', () => {
    const expiredToken = createMockToken(-100);
    useAuthStore.setState({
      user: {
        id: 'user-1',
        name: 'John',
        email: 'john@test.com',
        role: 'cashier',
        businessId: 'biz-1',
        outletId: 'outlet-1',
        employeeId: 'emp-1',
      },
      token: expiredToken,
      isAuthenticated: true,
    });

    renderWithRouter();

    // After redirect, auth state should be cleaned up
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('redirects when token is malformed', () => {
    useAuthStore.setState({
      user: {
        id: 'user-1',
        name: 'John',
        email: 'john@test.com',
        role: 'cashier',
        businessId: 'biz-1',
        outletId: 'outlet-1',
        employeeId: 'emp-1',
      },
      token: 'invalid-token',
      isAuthenticated: true,
    });

    renderWithRouter();

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
