import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { clsx } from 'clsx';
import { calculatePercentageChange, formatPercentageChange } from '@/lib/date-utils';

interface TrendIndicatorProps {
  current: number;
  previous: number;
  /** Show absolute difference instead of percentage */
  showAbsolute?: boolean;
  /** Invert colors (e.g., for cost metrics where down is good) */
  invertColors?: boolean;
  className?: string;
}

export function TrendIndicator({
  current,
  previous,
  showAbsolute = false,
  invertColors = false,
  className,
}: TrendIndicatorProps) {
  const change = current - previous;
  const percentageChange = calculatePercentageChange(current, previous);

  // Determine trend direction
  const isUp = change > 0;
  const isFlat = change === 0;

  // Color logic
  const getColorClass = () => {
    if (isFlat) return 'text-muted-foreground';
    if (invertColors) {
      return isUp ? 'text-red-600' : 'text-green-600';
    }
    return isUp ? 'text-green-600' : 'text-red-600';
  };

  // Icon selection
  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;

  // Format display text
  const displayText = showAbsolute
    ? `${change > 0 ? '+' : ''}${change.toFixed(0)}`
    : formatPercentageChange(percentageChange);

  return (
    <div className={clsx('flex items-center gap-1 text-sm font-medium', getColorClass(), className)}>
      <Icon className="h-4 w-4" />
      <span>{displayText}</span>
      <span className="text-xs text-muted-foreground">vs sebelumnya</span>
    </div>
  );
}
