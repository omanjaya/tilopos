import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { getSharedSocket, releaseSharedSocket } from '@/hooks/realtime/socket.util';
import { apiClient } from '@/api/client';
import { toast } from '@/lib/toast-utils';

interface ShiftInfo {
  shiftId: string;
  employeeId: string;
  employeeName: string;
  outletId: string;
  startedAt: string;
  isActive: boolean;
  totalSales?: number;
  cashCollected?: number;
}

interface ShiftStartedEvent {
  shiftId: string;
  employeeId: string;
  employeeName: string;
  outletId: string;
  occurredOn: string;
}

interface ShiftEndedEvent {
  shiftId: string;
  employeeId: string;
  employeeName: string;
  outletId: string;
  totalSales: number;
  cashCollected: number;
  occurredOn: string;
}

interface UseShiftStatusReturn {
  currentShift: ShiftInfo | null;
  isConnected: boolean;
  isLoading: boolean;
  clearShift: () => void;
  startShift: (employeeId: string, outletId: string, openingCash: number) => Promise<void>;
  endShift: (employeeId: string, closingCash: number, notes?: string) => Promise<void>;
  refetchShift: () => Promise<void>;
}

export function useShiftStatus(): UseShiftStatusReturn {
  const [currentShift, setCurrentShift] = useState<ShiftInfo | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const user = useAuthStore((s) => s.user);

  const clearShift = useCallback(() => {
    setCurrentShift(null);
  }, []);

  const token = useAuthStore((s) => s.token);

  // Fetch current shift from API
  const refetchShift = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await apiClient.get('/employees/shifts/current');
      const shift = response.data;
      if (shift) {
        setCurrentShift({
          shiftId: shift.id,
          employeeId: shift.employeeId,
          employeeName: shift.employee?.name || user?.name || '',
          outletId: shift.outletId,
          startedAt: shift.startedAt,
          isActive: true,
          totalSales: shift.totalSales,
          cashCollected: shift.cashCollected,
        });
      } else {
        setCurrentShift(null);
      }
    } catch (error) {
      // 404 or no active shift is expected
      setCurrentShift(null);
    } finally {
      setIsLoading(false);
    }
  }, [token, user?.name]);

  // Start shift function
  const startShift = useCallback(async (_employeeId: string, outletId: string, openingCash: number) => {
    if (!token) {
      toast.error({ title: 'Error', description: 'Not authenticated' });
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('/employees/shifts/start', {
        outletId,
        openingCash,
      });

      toast.success({
        title: 'Shift Berhasil Dimulai',
        description: 'Anda sekarang dapat memproses transaksi',
      });

      // Refetch to get the new shift data
      await refetchShift();
    } catch (error) {
      console.error('Failed to start shift:', error);
      toast.error({
        title: 'Gagal Memulai Shift',
        description: 'Terjadi kesalahan saat memulai shift. Silakan coba lagi.',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [token, refetchShift]);

  // End shift function
  const endShift = useCallback(async (_employeeId: string, closingCash: number, notes?: string) => {
    if (!token) {
      toast.error({ title: 'Error', description: 'Not authenticated' });
      return;
    }

    setIsLoading(true);
    try {
      // First get current shift to get shiftId
      const response = await apiClient.get('/employees/shifts/current');
      const shift = response.data;
      const shiftId = shift?.id;

      if (!shiftId) {
        throw new Error('No active shift found');
      }

      await apiClient.post(`/employees/shifts/${shiftId}/end`, {
        closingCash,
        notes,
      });

      toast.success({
        title: 'Shift Berhasil Diakhiri',
        description: 'Laporan shift telah dibuat',
      });

      // Clear current shift
      setCurrentShift(null);
    } catch (error) {
      console.error('Failed to end shift:', error);
      toast.error({
        title: 'Gagal Mengakhiri Shift',
        description: 'Terjadi kesalahan saat mengakhiri shift. Silakan coba lagi.',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setIsConnected(false);
      return;
    }

    const socket = getSharedSocket();
    if (!socket) return;

    const onConnect = () => {
      setIsConnected(true);
      if (user?.outletId) {
        socket.emit('joinRoom', {
          room: 'outlet',
          outletId: user.outletId,
          businessId: user.businessId,
        });
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onShiftStarted = (data: ShiftStartedEvent) => {
      setCurrentShift({
        shiftId: data.shiftId,
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        outletId: data.outletId,
        startedAt: data.occurredOn,
        isActive: true,
      });
    };

    const onShiftEnded = (data: ShiftEndedEvent) => {
      setCurrentShift(prev => {
        if (prev?.shiftId === data.shiftId) {
          return {
            ...prev,
            isActive: false,
            totalSales: data.totalSales,
            cashCollected: data.cashCollected,
          };
        }
        return prev;
      });
    };

    // If already connected, fire handler immediately
    if (socket.connected) onConnect();

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('shift:started', onShiftStarted);
    socket.on('shift:ended', onShiftEnded);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('shift:started', onShiftStarted);
      socket.off('shift:ended', onShiftEnded);
      releaseSharedSocket();
    };
  }, [token, user?.outletId, user?.businessId]);

  // Fetch current shift on mount
  useEffect(() => {
    if (token && user?.employeeId) {
      refetchShift();
    }
  }, [token, user?.employeeId, refetchShift]);

  return { currentShift, isConnected, isLoading, clearShift, startShift, endShift, refetchShift };
}
