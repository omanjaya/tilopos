import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getElapsedBadgeVariant } from './kds-style-utils';

interface OrderTimerProps {
  elapsedMinutes: number;
  className?: string;
}

export function OrderTimer({ elapsedMinutes, className }: OrderTimerProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Clock className="h-4 w-4 text-zinc-400" />
      <span
        className={cn(
          'text-sm font-mono font-bold',
          getElapsedBadgeVariant(elapsedMinutes),
          'rounded px-2 py-0.5',
        )}
      >
        {elapsedMinutes}m
      </span>
    </div>
  );
}
