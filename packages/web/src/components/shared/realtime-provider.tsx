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
  const prevConnected = useRef<boolean | null>(null);

  useEffect(() => {
    // Only show toasts after the initial connection has been established at least once
    if (prevConnected.current === null) {
      prevConnected.current = isConnected;
      return;
    }

    if (prevConnected.current && !isConnected) {
      toast({
        title: 'Koneksi terputus',
        description: 'Mencoba menghubungkan kembali...',
        variant: 'destructive',
      });
    }

    if (!prevConnected.current && isConnected) {
      toast({
        title: 'Terhubung kembali',
        description: 'Koneksi real-time berhasil dipulihkan.',
      });
    }

    prevConnected.current = isConnected;
  }, [isConnected]);

  return (
    <RealtimeContext.Provider value={{ isConnected }}>
      {children}
    </RealtimeContext.Provider>
  );
}
