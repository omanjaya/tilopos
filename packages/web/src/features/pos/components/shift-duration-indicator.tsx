import { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const WARNING_HOURS = 8;

/**
 * Format duration from ISO datetime to Indonesian format (Xj Ym).
 * "j" = jam (hours), "m" = menit (minutes).
 */
function formatDuration(startedAt: string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}j ${minutes}m`;
}

/**
 * Get elapsed hours from start time.
 */
function getElapsedHours(startedAt: string): number {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Format time to HH:mm format in Indonesian locale.
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format currency to Indonesian Rupiah.
 */
function formatCurrency(amount?: number): string {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export interface ShiftDurationIndicatorProps {
  /** ISO datetime string when shift started */
  startedAt: string;
  /** Opening cash amount (optional) */
  openingCash?: number;
  /** Number of transactions (optional) */
  transactionCount?: number;
  /** Click handler (optional, defaults to opening detail dialog) */
  onClick?: () => void;
}

/**
 * Shift Duration Indicator - Badge showing shift duration in POS header.
 *
 * Features:
 * - Displays duration in "3j 25m" format (hours and minutes)
 * - Auto-updates every minute without excessive re-renders
 * - Shows warning color (yellow/orange) after 8 hours
 * - Click to view shift details in a mini popup
 * - Only visible when shift is active (startedAt is provided)
 *
 * @example
 * ```tsx
 * <ShiftDurationIndicator
 *   startedAt="2025-01-15T08:00:00Z"
 *   openingCash=500000
 *   transactionCount={42}
 * />
 * ```
 */
export function ShiftDurationIndicator({
  startedAt,
  openingCash,
  transactionCount,
  onClick,
}: ShiftDurationIndicatorProps) {
  const [duration, setDuration] = useState(() => formatDuration(startedAt));
  const [isWarning, setIsWarning] = useState(() => getElapsedHours(startedAt) >= WARNING_HOURS);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update duration every minute
  useEffect(() => {
    const updateDuration = () => {
      setDuration(formatDuration(startedAt));
      setIsWarning(getElapsedHours(startedAt) >= WARNING_HOURS);
    };

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval - update every minute (60000ms)
    intervalRef.current = setInterval(updateDuration, 60000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startedAt]);

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
    } else {
      setIsDialogOpen(true);
    }
  }, [onClick]);

  // Don't render if no shift is active
  if (!startedAt) {
    return null;
  }

  const elapsedHours = getElapsedHours(startedAt);

  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          'flex items-center gap-1.5 rounded-full border px-2.5 py-0.5',
          'text-xs font-semibold transition-all duration-200',
          'hover:opacity-80 active:scale-95',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          isWarning
            ? 'border-warning/20 bg-warning/10 text-warning hover:bg-warning/20'
            : 'border-success/20 bg-success/10 text-success hover:bg-success/20'
        )}
        title={`Durasi shift: ${elapsedHours.toFixed(1)} jam. Klik untuk detail.`}
      >
        <Clock className="h-3 w-3" />
        <span>{duration}</span>
        {isWarning && <AlertCircle className="h-3 w-3" />}
      </button>

      {/* Shift Detail Dialog */}
      <Dialog open={isDialogOpen && !onClick} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Detail Shift
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Duration */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Durasi</span>
              <Badge variant={isWarning ? 'warning' : 'success'} className="text-sm">
                {duration}
              </Badge>
            </div>

            {/* Started At */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Mulai</span>
              <span className="text-sm font-medium">{formatTime(startedAt)}</span>
            </div>

            {/* Opening Cash */}
            {openingCash !== undefined && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Modal Awal</span>
                <span className="text-sm font-medium">{formatCurrency(openingCash)}</span>
              </div>
            )}

            {/* Transaction Count */}
            {transactionCount !== undefined && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Transaksi</span>
                <Badge variant="secondary" className="text-sm">
                  {transactionCount}
                </Badge>
              </div>
            )}

            {/* Warning message for long shifts */}
            {isWarning && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-warning">
                  Shift telah berjalan lebih dari {WARNING_HOURS} jam. Pertimbangkan untuk
                  melakukan shift end dan istirahat.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
