import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { shiftsApi } from '@/api/endpoints/shifts.api';
import { useAuthStore } from '@/stores/auth.store';
import { useRealtimeShiftSales, useRealtimeTransactions } from '@/hooks/use-realtime';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Clock, User, DollarSign, AlertTriangle } from 'lucide-react';
import type { Shift } from '@/types/order.types';

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

function formatElapsedTime(startedAt: string): string {
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const diff = now - start;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatStartTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ActiveShiftBanner() {
  const user = useAuthStore((s) => s.user);
  const employeeId = user?.employeeId || '';

  const { data: shifts } = useQuery({
    queryKey: ['shifts', employeeId],
    queryFn: () => shiftsApi.list(employeeId),
    enabled: !!employeeId,
  });

  const activeShift: Shift | null = shifts?.find((s) => !s.endedAt) ?? null;

  const [elapsed, setElapsed] = useState('00:00:00');
  const [isOvertime, setIsOvertime] = useState(false);
  const [runningTotalSales, setRunningTotalSales] = useState(0);

  // Initialize running total from shift data
  useEffect(() => {
    if (activeShift) {
      setRunningTotalSales(activeShift.totalSales ?? 0);
    }
  }, [activeShift]);

  // Live elapsed time update
  useEffect(() => {
    if (!activeShift) return;

    const update = () => {
      setElapsed(formatElapsedTime(activeShift.startedAt));
      const diff = Date.now() - new Date(activeShift.startedAt).getTime();
      setIsOvertime(diff > EIGHT_HOURS_MS);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeShift]);

  // Listen for real-time shift sales updates
  const onSalesUpdate = useCallback(
    (event: { shiftId: string; totalSales: number }) => {
      if (activeShift && event.shiftId === activeShift.id) {
        setRunningTotalSales(event.totalSales);
      }
    },
    [activeShift],
  );

  useRealtimeShiftSales({ onSalesUpdate });

  // Also listen for transaction created events to increment sales
  const onTransactionCreated = useCallback(
    (event: { totalAmount: number; outletId: string }) => {
      if (activeShift && event.outletId === activeShift.outletId) {
        setRunningTotalSales((prev) => prev + event.totalAmount);
      }
    },
    [activeShift],
  );

  useRealtimeTransactions({ onTransactionCreated });

  if (!activeShift) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2 text-sm',
        isOvertime
          ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
          : 'border-primary/20 bg-primary/5 text-foreground',
      )}
    >
      <div className="flex items-center gap-4">
        {/* Cashier name */}
        <div className="flex items-center gap-1.5">
          <User className="h-4 w-4 shrink-0" />
          <span className="font-medium">{activeShift.employeeName}</span>
        </div>

        {/* Start time */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0" />
          <span>Mulai: {formatStartTime(activeShift.startedAt)}</span>
        </div>

        {/* Elapsed time */}
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'font-mono font-semibold tabular-nums',
              isOvertime && 'text-yellow-600 dark:text-yellow-400',
            )}
          >
            {elapsed}
          </span>
          {isOvertime && (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          )}
        </div>
      </div>

      {/* Running total sales */}
      <div className="flex items-center gap-1.5">
        <DollarSign className="h-4 w-4 shrink-0" />
        <span className="font-semibold">{formatCurrency(runningTotalSales)}</span>
      </div>
    </div>
  );
}
