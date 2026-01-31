import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ReportErrorStateProps {
  title?: string;
  description?: string;
  error?: Error | null;
  onRetry?: () => void;
}

export function ReportErrorState({
  title = 'Gagal memuat data',
  description = 'Terjadi kesalahan saat memuat laporan.',
  error,
  onRetry,
}: ReportErrorStateProps) {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <span>{description}</span>
        {error && (
          <code className="text-xs bg-destructive/10 p-2 rounded">
            {error.message}
          </code>
        )}
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="w-fit">
            Coba Lagi
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
