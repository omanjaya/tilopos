import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';

const SOCKET_URL = import.meta.env.VITE_WS_URL || '';
const SOCKET_NAMESPACE = '/notifications';

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
  const socketRef = useRef<Socket | null>(null);
  const user = useAuthStore((s) => s.user);

  const clearShift = useCallback(() => {
    setCurrentShift(null);
  }, []);

  useEffect(() => {
    const socket = io(`${SOCKET_URL}${SOCKET_NAMESPACE}`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Join outlet room when connected
      if (user?.outletId) {
        socket.emit('joinRoom', {
          room: 'outlet',
          outletId: user.outletId,
          businessId: user.businessId,
        });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('shift:started', (data: ShiftStartedEvent) => {
      setCurrentShift({
        shiftId: data.shiftId,
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        outletId: data.outletId,
        startedAt: data.occurredOn,
        isActive: true,
      });
    });

    socket.on('shift:ended', (data: ShiftEndedEvent) => {
      setCurrentShift(prev => {
        // Only update if this is the current active shift
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
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.outletId, user?.businessId]);

  return { currentShift, isConnected, clearShift };
}
