import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { handleMutationError } from '@/lib/api-error-handler';
import { meToAuthUser } from './auth-user';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authApi } from '@/api/endpoints/auth.api';
import { useAuthStore } from '@/stores/auth.store';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const resendMutation = useMutation({
    mutationFn: authApi.sendVerificationEmail,
    onSuccess: (res) => {
      setMessage(res.message || 'Email verifikasi baru telah dikirim. Cek inbox kamu.');
      setStatus('success');
    },
    onError: (error) => handleMutationError(error, 'Gagal mengirim ulang email verifikasi'),
  });

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token verifikasi tidak ditemukan');
      return;
    }

    authApi
      .verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.message);
        // Refresh the logged-in user from the server (source of truth)
        if (useAuthStore.getState().token) {
          authApi
            .getMe()
            .then((me) => updateUser(meToAuthUser(me, useAuthStore.getState().user)))
            .catch((err: unknown) => {
              // intentionally ignored: the verification itself succeeded; profile refresh is best-effort
              console.warn('Gagal memuat ulang profil setelah verifikasi email', err);
            });
        }
      })
      .catch((err) => {
        setStatus('error');
        setMessage(
          err?.response?.data?.message ?? 'Token verifikasi tidak valid atau sudah kadaluarsa',
        );
      });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-bold text-primary">TiloPOS</h1>

        {status === 'loading' && (
          <div className="space-y-3">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Memverifikasi email...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
            <p className="text-lg font-medium">{message}</p>
            <Button onClick={() => navigate('/app')} className="w-full">
              Buka Dashboard
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <XCircle className="mx-auto h-16 w-16 text-destructive" />
            <p className="text-lg font-medium text-destructive">{message}</p>
            {user && (
              <Button
                variant="outline"
                disabled={resendMutation.isPending}
                aria-busy={resendMutation.isPending}
                onClick={() => resendMutation.mutate()}
              >
                {resendMutation.isPending && <Loader2 className="animate-spin" />}
                Kirim Ulang Email Verifikasi
              </Button>
            )}
            <Button variant="ghost" onClick={() => navigate('/app')}>
              Kembali ke Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
