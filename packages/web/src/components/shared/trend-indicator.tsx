import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { clsx } from 'clsx';
import { calculatePercentageChange, formatPercentageChange } from '@/lib/date-utils';
import { formatNumber } from '@/lib/format';

interface TrendIndicatorProps {
  current: number | null | undefined;
  previous: number | null | undefined;
  /** Show absolute difference instead of percentage */
  showAbsolute?: boolean;
  /** Invert colors (e.g., for cost metrics where down is good) */
  invertColors?: boolean;
  /** Label text (default: "vs sebelumnya") */
  label?: string;
  /** Hide label */
  hideLabel?: boolean;
  className?: string;
}

/**
 * Trend Indicator Component
 *
 * Shows trend comparison between current and previous values with:
 * - Color-coded direction (green = up, red = down, gray = flat)
 * - Icon indicator
 * - Percentage or absolute change
 * - Safe handling of null/undefined/NaN/Infinity
 *
 * @example
 * ```tsx
 * <TrendIndicator current={1500} previous={1200} />
 * <TrendIndicator current={cost} previous={prevCost} invertColors />
 * <TrendIndicator current={total} previous={prevTotal} showAbsolute />
 * ```
 */
export function TrendIndicator({
  current,
  previous,
  showAbsolute = false,
  invertColors = false,
  label = 'vs sebelumnya',
  hideLabel = false,
  className,
}: TrendIndicatorProps) {
  // Handle null/undefined/NaN/Infinity edge cases
  const safeCurrent = current ?? 0;
  const safePrevious = previous ?? 0;

  // Check for non-finite values
  const isValidCurrent = isFinite(safeCurrent);
  const isValidPrevious = isFinite(safePrevious);

  // If either value is invalid, show neutral indicator
  if (!isValidCurrent || !isValidPrevious) {
    return (
      <div className={clsx('flex items-center gap-1 text-sm font-medium text-muted-foreground', className)}>
        <Minus className="h-4 w-4" />
        <span>N/A</span>
        {!hideLabel && <span className="text-xs text-muted-foreground">{label}</span>}
      </div>
    );
  }

  const change = safeCurrent - safePrevious;
  const percentageChange = calculatePercentageChange(safeCurrent, safePrevious);

  // Determine trend direction (with threshold for "flat")
  const threshold = 0.01; // Consider changes < 0.01 as flat
  const isUp = change > threshold;
  const isDown = change < -threshold;
  const isFlat = !isUp && !isDown;

  // Color logic
  const getColorClass = () => {
    if (isFlat) return 'text-muted-foreground';
    if (invertColors) {
      return isUp ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500';
    }
    return isUp ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500';
  };

  // Icon selection
  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;

  // Format display text
  const displayText = showAbsolute
    ? `${change > 0 ? '+' : ''}${formatNumber(change, 0)}`
    : formatPercentageChange(percentageChange);

  return (
    <div
      className={clsx('flex items-center gap-1 text-sm font-medium', getColorClass(), className)}
      role="status"
      aria-label={`Trend: ${displayText} ${label}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{displayText}</span>
      {!hideLabel && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}
