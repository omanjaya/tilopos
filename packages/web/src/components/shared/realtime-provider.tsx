import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { toast } from '@/hooks/use-toast';

interface RealtimeContextValue {
  isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextValue>({ isConnected: false });

// eslint-disable-next-line react-refresh/only-export-components
export function useRealtimeStatus() {
  return useContext(RealtimeContext);
}

interface RealtimeProviderProps {
  children: ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { isConnected } = useRealtimeSync();
  const hasConnectedOnce = useRef(false);
  const wasDisconnected = useRef(false);
  const disconnectToastRef = useRef<{ dismiss: () => void } | null>(null);

  useEffect(() => {
    // Track first successful connection — never show toast for the initial connect
    if (!hasConnectedOnce.current) {
      if (isConnected) {
        hasConnectedOnce.current = true;
      }
      return;
    }

    // After the first connection, track disconnect → reconnect
    if (!isConnected && !wasDisconnected.current) {
      wasDisconnected.current = true;
      disconnectToastRef.current?.dismiss();
      const t = toast({
        title: 'Koneksi terputus',
        description: 'Mencoba menghubungkan kembali...',
        variant: 'destructive',
        className: 'py-3 px-4',
      });
      disconnectToastRef.current = t;
    }

    if (isConnected && wasDisconnected.current) {
      wasDisconnected.current = false;
      disconnectToastRef.current?.dismiss();
      disconnectToastRef.current = null;

      const t = toast({
        title: 'Terhubung kembali',
        description: 'Koneksi real-time berhasil dipulihkan.',
        className: 'py-3 px-4 border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100',
      });
      setTimeout(() => t.dismiss(), 3000);
    }
  }, [isConnected]);

  return (
    <RealtimeContext.Provider value={{ isConnected }}>
      {children}
    </RealtimeContext.Provider>
  );
}
