import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/endpoints/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { handleMutationError } from '@/lib/api-error-handler';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { isMfaChallenge } from '@/types/auth.types';
import type { LoginResponse, MfaVerifyResponse } from '@/types/auth.types';
import { homePathForRole } from '@/config/permissions';
import { meToAuthUser } from './auth-user';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  // Set when POST /auth/login answers with an MFA challenge (never read from the URL).
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  const finishLogin = (data: LoginResponse) => {
    queryClient.clear();
    setAuth(
      {
        id: data.employeeId,
        name: data.employeeName,
        email: email || null,
        role: data.role,
        businessId: data.businessId,
        outletId: data.outletId,
        outletName: data.outletName ?? undefined,
        employeeId: data.employeeId,
        onboardingCompleted: data.onboardingCompleted ?? false,
        emailVerified: data.emailVerified ?? false,
      },
      data.accessToken,
    );

    // Sync onboarding status to localStorage so the provider doesn't re-show
    if (data.onboardingCompleted) {
      localStorage.setItem('tilo_onboarding_completed', 'true');
    }

    navigate(homePathForRole(data.role), { replace: true });
  };

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (result) => {
      if (isMfaChallenge(result)) {
        setMfaToken(result.mfaToken);
        setMfaCode('');
        return;
      }
      finishLogin(result);
    },
    onError: (error) => handleMutationError(error, 'Login gagal'),
  });

  const mfaMutation = useMutation({
    mutationFn: async (vars: { mfaToken: string; token: string }) => {
      const verified: MfaVerifyResponse = await authApi.verifyMfa(vars);
      // verify returns only the token + identity; load the full profile with the new token
      const me = await authApi.getMe(verified.accessToken);
      return { verified, me };
    },
    onSuccess: ({ verified, me }) => {
      const user = meToAuthUser(me);
      finishLogin({
        accessToken: verified.accessToken,
        employeeId: verified.employeeId,
        employeeName: verified.employeeName,
        role: verified.role,
        businessId: verified.businessId,
        outletId: verified.outletId,
        outletName: user.outletName ?? null,
        onboardingCompleted: me.onboardingCompleted,
        emailVerified: me.emailVerified,
      });
    },
    onError: (error) => handleMutationError(error, 'Kode verifikasi salah atau kedaluwarsa'),
  });

  const handleMfaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaToken) return;
    mfaMutation.mutate({ mfaToken, token: mfaCode });
  };

  if (mfaToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Verifikasi Dua Langkah</CardTitle>
            <CardDescription>
              Masukkan 6 digit kode dari aplikasi autentikator Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mfa-code">Kode Verifikasi</Label>
                <Input
                  id="mfa-code"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  maxLength={6}
                  autoFocus
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={mfaMutation.isPending || mfaCode.length !== 6}
                aria-busy={mfaMutation.isPending}
              >
                {mfaMutation.isPending && <Loader2 className="animate-spin" />}
                Verifikasi
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setMfaToken(null);
                  setMfaCode('');
                  setPin('');
                }}
              >
                Kembali ke login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, pin });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">TILO</CardTitle>
          <CardDescription>Masuk ke akun backoffice Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                type="password"
                placeholder="Masukkan PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                maxLength={8}
                inputMode="numeric"
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
              aria-busy={loginMutation.isPending}
            >
              {loginMutation.isPending && <Loader2 className="animate-spin" />}
              Masuk
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Belum punya akun?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Daftar sekarang
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
