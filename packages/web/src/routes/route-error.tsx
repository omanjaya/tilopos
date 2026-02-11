import { useRouteError, useNavigate } from 'react-router-dom';

// eslint-disable-next-line react-refresh/only-export-components
export function RouteErrorPage() {
  const error = useRouteError() as Error & { status?: number; statusText?: string };
  const navigate = useNavigate();

  const is404 = (error as { status?: number }).status === 404;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <span className="text-3xl">{is404 ? '🔍' : '⚠️'}</span>
        </div>
        <h1 className="mt-4 text-xl font-bold">
          {is404 ? 'Halaman Tidak Ditemukan' : 'Terjadi Kesalahan'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {is404
            ? 'Halaman yang kamu cari tidak tersedia.'
            : 'Aplikasi mengalami error. Silakan coba lagi.'}
        </p>
        {!is404 && error?.message && (
          <p className="mt-2 rounded bg-muted p-2 text-xs text-muted-foreground font-mono break-all">
            {error.message}
          </p>
        )}
        <div className="mt-4 flex justify-center gap-2">
          <button
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => navigate('/app')}
          >
            Ke Dashboard
          </button>
          <button
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            onClick={() => window.location.reload()}
          >
            Muat Ulang
          </button>
        </div>
      </div>
    </div>
  );
}
