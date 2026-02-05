import { useOnlineStatus } from '@/hooks/use-online-status';
import { WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Offline Banner Component
 *
 * Shows a warning banner when the browser goes offline.
 * Automatically hides when connection is restored.
 *
 * Place this component at the top level of your app (in App.tsx or layout).
 *
 * @example
 * ```tsx
 * export function App() {
 *   return (
 *     <div>
 *       <OfflineBanner />
 *       <YourAppContent />
 *     </div>
 *   );
 * }
 * ```
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <Alert
      variant="destructive"
      className="rounded-none border-x-0 border-t-0 border-b"
    >
      <WifiOff className="h-4 w-4" />
      <AlertDescription>
        Tidak ada koneksi internet. Beberapa fitur mungkin tidak berfungsi dengan baik.
        Data akan disinkronkan saat koneksi kembali tersambung.
      </AlertDescription>
    </Alert>
  );
}
