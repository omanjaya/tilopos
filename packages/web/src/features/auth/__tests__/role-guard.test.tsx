import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RoleGuard } from '../role-guard';
import { useAuthStore } from '@/stores/auth.store';
import type { AuthUser } from '@/types/auth.types';

function setRole(role: string | null) {
  useAuthStore.setState({
    user: role ? ({ employeeId: 'e1', role, name: 'Test' } as unknown as AuthUser) : null,
    token: role ? 'token' : null,
    isAuthenticated: !!role,
  });
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="*"
          element={
            <RoleGuard>
              <div>Page Content</div>
            </RoleGuard>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RoleGuard (ROUTE_ROLES)', () => {
  beforeEach(() => setRole(null));

  it('redirects anonymous users to login', () => {
    renderAt('/app/settlements');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('shows an access-denied page instead of silently redirecting', () => {
    setRole('supervisor');
    renderAt('/app/settlements');
    expect(screen.getByText('Akses ditolak')).toBeInTheDocument();
    expect(screen.queryByText('Page Content')).not.toBeInTheDocument();
  });

  it('renders the page when the role matches backend @Roles', () => {
    setRole('manager');
    renderAt('/app/settlements');
    expect(screen.getByText('Page Content')).toBeInTheDocument();
  });

  it('lets managers open settings (SettingsController allows owner, manager)', () => {
    setRole('manager');
    renderAt('/app/settings/tax');
    expect(screen.getByText('Page Content')).toBeInTheDocument();
  });

  it('blocks kitchen staff from the POS', () => {
    setRole('kitchen');
    renderAt('/pos');
    expect(screen.getByText('Akses ditolak')).toBeInTheDocument();
  });
});
