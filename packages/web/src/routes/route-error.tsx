import { useEffect } from 'react';
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';

const CHUNK_RELOAD_KEY = 'tilo-chunk-reload-at';

/** A lazy chunk that no longer exists after a deploy. */
function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(
    message,
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  const is404 = isRouteErrorResponse(error) && error.status === 404;
  const chunkError = isChunkLoadError(error);

  // After a deploy, old lazy chunks 404: reload once to pick up the new build.
  useEffect(() => {
    if (!chunkError) return;
    try {
      const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 0);
      if (Date.now() - last > 30_000) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
        window.location.reload();
      }
    } catch (storageError) {
      // Storage unavailable: skip the automatic reload, the user can press "Muat Ulang"
      console.warn('[route-error] cannot use sessionStorage for chunk reload', storageError);
    }
  }, [chunkError]);

  // Raw error text is only shown in development (it may contain internal details)
  const devMessage =
    import.meta.env.DEV && !is404
      ? error instanceof Error
        ? error.message
        : isRouteErrorResponse(error)
          ? `${error.status} ${error.statusText}`
          : undefined
      : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <span className="text-3xl" aria-hidden="true">{is404 ? '🔍' : '⚠️'}</span>
        </div>
        <h1 className="mt-4 text-xl font-bold">
          {is404 ? 'Halaman Tidak Ditemukan' : chunkError ? 'Versi Aplikasi Diperbarui' : 'Terjadi Kesalahan'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {is404
            ? 'Halaman yang Anda cari tidak tersedia.'
            : chunkError
              ? 'Aplikasi baru saja diperbarui. Muat ulang halaman untuk melanjutkan.'
              : 'Aplikasi mengalami error. Silakan coba lagi.'}
        </p>
        {devMessage && (
          <p className="mt-2 rounded bg-muted p-2 text-xs text-muted-foreground font-mono break-all">
            {devMessage}
          </p>
        )}
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => navigate('/')}
          >
            Ke Beranda
          </button>
          <button
            type="button"
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
