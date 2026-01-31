import { WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OfflineIndicatorProps {
  isOnline: boolean;
}

export function OfflineIndicator({ isOnline }: OfflineIndicatorProps) {
  if (isOnline) return null;

  return (
    <Alert variant="warning" className="mb-4 border-yellow-200 bg-yellow-50">
      <WifiOff className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="text-yellow-800">
        Mode Offline - Beberapa fitur mungkin tidak tersedia. Periksa koneksi internet Anda.
      </AlertDescription>
    </Alert>
  );
}
