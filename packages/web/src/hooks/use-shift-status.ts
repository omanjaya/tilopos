import { useEffect, useState, useCallback, useRef } from 'react';
import { isAxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import {
  getSharedSocket,
  releaseSharedSocket,
  resolveRoom,
  acquireRoom,
  releaseRoom,
} from '@/hooks/realtime/socket.util';
import { useEffectiveOutletId } from '@/hooks/realtime/use-socket';
import { apiClient } from '@/api/client';
import { toast } from '@/lib/toast-utils';
import { getErrorMessage, isErrorHandled } from '@/lib/api-error-handler';
import { readCachedShift, writeCachedShift, clearCachedShift } from '@/services/sync/shift-cache';

export interface ShiftInfo {
  shiftId: string;
  employeeId: string;
  employeeName: string;
  outletId: string;
  startedAt: string;
  openingCash: number;
  isActive: boolean;
  totalSales?: number;
  cashCollected?: number;
  /** True when the shift comes from the local cache because the server was unreachable */
  fromCache?: boolean;
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

/** Shape of GET /employees/shifts/current (ShiftRecord or `{ shift: null }`) */
interface CurrentShiftResponse {
  id?: string;
  outletId?: string;
  employeeId?: string;
  startedAt?: string;
  openingCash?: number | string;
  shift?: null;
}

interface UseShiftStatusReturn {
  currentShift: ShiftInfo | null;
  isConnected: boolean;
  isLoading: boolean;
  /** Set when the last fetch failed for a reason other than "no active shift" */
  shiftError: string | null;
  clearShift: () => void;
  startShift: (employeeId: string, outletId: string, openingCash: number) => Promise<void>;
  endShift: (employeeId: string, closingCash: number, notes?: string) => Promise<void>;
  refetchShift: () => Promise<void>;
}

function describeError(error: unknown): string {
  if (isAxiosError(error)) {
    const { title, description } = getErrorMessage(error);
    return description ? `${title}: ${description}` : title;
  }
  return error instanceof Error ? error.message : 'Terjadi kesalahan';
}

/**
 * Fetch the current user's open shift.
 * Returns `null` only when the server explicitly says there is no open shift;
 * throws on network / server errors so callers can fall back to the cached shift.
 */
export async function fetchCurrentShift(): Promise<CurrentShiftResponse | null> {
  const response = await apiClient.get<CurrentShiftResponse>('/employees/shifts/current');
  const raw = response.data;
  if (!raw || raw.shift === null || !raw.id) return null;
  return raw;
}

export function useShiftStatus(): UseShiftStatusReturn {
  const [currentShift, setCurrentShift] = useState<ShiftInfo | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shiftError, setShiftError] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const outletId = useEffectiveOutletId();
  const userId = user?.id ?? null;

  const clearShift = useCallback(() => {
    setCurrentShift(null);
    clearCachedShift(userId);
  }, [userId]);

  const refetchShift = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const shift = await fetchCurrentShift();
      setShiftError(null);
      if (shift?.id) {
        const info: ShiftInfo = {
          shiftId: shift.id,
          employeeId: shift.employeeId ?? user?.employeeId ?? '',
          employeeName: user?.name ?? '',
          outletId: shift.outletId ?? '',
          startedAt: String(shift.startedAt ?? ''),
          openingCash: Number(shift.openingCash ?? 0),
          isActive: true,
        };
        setCurrentShift(info);
        writeCachedShift(userId, {
          shiftId: info.shiftId,
          employeeId: info.employeeId,
          employeeName: info.employeeName,
          outletId: info.outletId,
          startedAt: info.startedAt,
          openingCash: info.openingCash,
        });
      } else {
        setCurrentShift(null);
        clearCachedShift(userId);
      }
    } catch (error) {
      // Outage / offline: keep the last known shift so the POS can keep selling offline
      const cached = readCachedShift(userId);
      if (cached) {
        setCurrentShift({
          shiftId: cached.shiftId,
          employeeId: cached.employeeId,
          employeeName: cached.employeeName,
          outletId: cached.outletId,
          startedAt: cached.startedAt,
          openingCash: cached.openingCash ?? 0,
          isActive: true,
          fromCache: true,
        });
      }
      setShiftError(describeError(error));
    } finally {
      setIsLoading(false);
    }
  }, [token, userId, user?.name, user?.employeeId]);

  // Keep a stable ref for refetchShift to avoid triggering the mount effect
  // when the callback identity changes (which would cause an infinite loop)
  const refetchShiftRef = useRef(refetchShift);
  useEffect(() => {
    refetchShiftRef.current = refetchShift;
  }, [refetchShift]);

  const startShift = useCallback(async (_employeeId: string, shiftOutletId: string, openingCash: number) => {
    if (!token) {
      toast.error({ title: 'Sesi tidak valid', description: 'Silakan login kembali' });
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('/employees/shifts/start', {
        outletId: shiftOutletId,
        openingCash,
      });

      toast.success({
        title: 'Shift Berhasil Dimulai',
        description: 'Anda sekarang dapat memproses transaksi',
      });

      await refetchShift();
    } catch (error) {
      if (!isErrorHandled(error)) {
        toast.error({ title: 'Gagal Memulai Shift', description: describeError(error) });
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [token, refetchShift]);

  const endShift = useCallback(async (_employeeId: string, closingCash: number, notes?: string) => {
    if (!token) {
      toast.error({ title: 'Sesi tidak valid', description: 'Silakan login kembali' });
      return;
    }

    setIsLoading(true);
    try {
      const shift = await fetchCurrentShift();
      if (!shift?.id) {
        throw new Error('Tidak ada shift aktif');
      }

      await apiClient.post(`/employees/shifts/${shift.id}/end`, {
        closingCash,
        notes,
      });

      toast.success({
        title: 'Shift Berhasil Diakhiri',
        description: 'Laporan shift telah dibuat',
      });

      setCurrentShift(null);
      clearCachedShift(userId);
    } catch (error) {
      if (!isErrorHandled(error)) {
        toast.error({ title: 'Gagal Mengakhiri Shift', description: describeError(error) });
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [token, userId]);

  useEffect(() => {
    if (!token) {
      setIsConnected(false);
      return;
    }

    const socket = getSharedSocket();
    if (!socket) return;

    let roomName: string | null = null;

    const onConnect = () => {
      setIsConnected(true);
      if (outletId && !roomName) {
        roomName = acquireRoom(socket, resolveRoom('outlet', { outletId, businessId: user?.businessId }));
      }
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    // The outlet room receives every employee's shift events: only adopt our own shift
    const onShiftStarted = (data: ShiftStartedEvent) => {
      if (!user?.employeeId || data.employeeId !== user.employeeId) return;
      setCurrentShift({
        shiftId: data.shiftId,
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        outletId: data.outletId,
        startedAt: data.occurredOn,
        openingCash: 0,
        isActive: true,
      });
      // Pull the full record (opening cash) and refresh the offline cache
      void refetchShiftRef.current();
    };

    const onShiftEnded = (data: ShiftEndedEvent) => {
      setCurrentShift(prev => {
        if (prev?.shiftId === data.shiftId) {
          clearCachedShift(userId);
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
      if (roomName) releaseRoom(socket, roomName);
      releaseSharedSocket();
    };
  }, [token, outletId, user?.businessId, user?.employeeId, userId]);

  // Fetch current shift on mount / when auth changes
  useEffect(() => {
    if (token && user?.employeeId) {
      void refetchShiftRef.current();
    }
  }, [token, user?.employeeId]);

  return { currentShift, isConnected, isLoading, shiftError, clearShift, startShift, endShift, refetchShift };
}
