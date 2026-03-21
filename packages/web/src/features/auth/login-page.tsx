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

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      queryClient.clear();
      setAuth(
        {
          id: data.employeeId,
          name: data.employeeName,
          email: null,
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

      // Role-based redirect: cashier → POS, kitchen → KDS, others → backoffice
      const redirectMap: Record<string, string> = {
        cashier: '/pos',
        kitchen: '/kds',
      };
      const redirectTo = redirectMap[data.role] ?? '/app';
      navigate(redirectTo, { replace: true });
    },
    onError: (error) => handleMutationError(error, 'Login gagal'),
  });

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
                maxLength={6}
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
