import { useEffect, useState } from 'react';

/**
 * Hook to detect online/offline status
 *
 * Returns true if browser is online, false if offline.
 * Updates automatically when connection status changes.
 *
 * @example
 * ```tsx
 * const isOnline = useOnlineStatus();
 *
 * if (!isOnline) {
 *   return <div>No internet connection</div>;
 * }
 * ```
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
