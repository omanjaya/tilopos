import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}

/**
 * Standard error UI for failed queries (Docs/ENGINEERING-RULES.md F2):
 * render this instead of an empty state when `isError` is true.
 */
export function ErrorState({
  title = 'Gagal memuat data',
  description = 'Terjadi kesalahan saat memuat data. Silakan coba lagi.',
  error,
  onRetry,
  className,
}: ErrorStateProps) {
  const message = error instanceof Error ? error.message : undefined;
  return (
    <Alert variant="destructive" className={className ?? 'my-4'}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <span>{description}</span>
        {message && <code className="rounded bg-destructive/10 p-2 text-xs">{message}</code>}
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="w-fit">
            Coba Lagi
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
