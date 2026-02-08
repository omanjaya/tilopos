import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { getSharedSocket, releaseSharedSocket } from '@/hooks/realtime/socket.util';

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
  clearShift: () => void;
}

export function useShiftStatus(): UseShiftStatusReturn {
  const [currentShift, setCurrentShift] = useState<ShiftInfo | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const user = useAuthStore((s) => s.user);

  const clearShift = useCallback(() => {
    setCurrentShift(null);
  }, []);

  useEffect(() => {
    const socket = getSharedSocket();

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
  }, [user?.outletId, user?.businessId]);

  return { currentShift, isConnected, clearShift };
}
