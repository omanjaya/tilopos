import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../login-page';
import { useAuthStore } from '@/stores/auth.store';

const { mockLogin, mockVerifyMfa, mockGetMe } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockVerifyMfa: vi.fn(),
  mockGetMe: vi.fn(),
}));

vi.mock('@/api/endpoints/auth.api', () => ({
  authApi: {
    login: (...a: unknown[]) => mockLogin(...a),
    verifyMfa: (...a: unknown[]) => mockVerifyMfa(...a),
    getMe: (...a: unknown[]) => mockGetMe(...a),
  },
}));

function renderLogin() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LoginPage MFA step', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it('does not log in on an MFA challenge and verifies the TOTP code', async () => {
    mockLogin.mockResolvedValue({ requiresMfa: true, mfaToken: 'mfa-tok' });
    mockVerifyMfa.mockResolvedValue({
      accessToken: 'access-tok',
      employeeId: 'e1',
      employeeName: 'Budi',
      role: 'owner',
      businessId: 'b1',
      outletId: null,
    });
    mockGetMe.mockResolvedValue({
      id: 'e1',
      businessId: 'b1',
      outletId: null,
      outletName: null,
      name: 'Budi',
      email: 'budi@example.com',
      phone: null,
      role: 'owner',
      profilePhotoUrl: null,
      onboardingCompleted: true,
      isActive: true,
      mfaEnabled: true,
      emailVerified: true,
    });

    renderLogin();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'budi@example.com' } });
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: '123456' } });
    fireEvent.submit(screen.getByLabelText('PIN').closest('form')!);

    const codeInput = await screen.findByLabelText('Kode Verifikasi');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    fireEvent.change(codeInput, { target: { value: '654321' } });
    fireEvent.submit(codeInput.closest('form')!);

    await waitFor(() => expect(useAuthStore.getState().token).toBe('access-tok'));
    expect(mockVerifyMfa).toHaveBeenCalledWith({ mfaToken: 'mfa-tok', token: '654321' });
    expect(mockGetMe).toHaveBeenCalledWith('access-tok');
  });
});
