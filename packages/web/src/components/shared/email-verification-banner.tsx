import { useState } from 'react';
import { Mail, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authApi } from '@/api/endpoints/auth.api';

export function EmailVerificationBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await authApi.sendVerificationEmail();
      setSent(true);
    } catch {
      // Silently fail — user can try again
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
      <div className="flex items-center gap-2 min-w-0">
        <Mail className="h-4 w-4 shrink-0" />
        <span className="truncate">
          {sent
            ? 'Email verifikasi telah dikirim. Cek inbox kamu.'
            : 'Email belum diverifikasi. Cek inbox kamu atau kirim ulang.'}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!sent && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={sending}
            className="h-7 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900"
          >
            {sending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
            Kirim Ulang
          </Button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
