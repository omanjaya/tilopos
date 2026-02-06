import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function getElapsedColor(minutes: number): string {
  if (minutes >= 10) return 'border-red-500 bg-red-500/10';
  if (minutes >= 5) return 'border-yellow-500 bg-yellow-500/10';
  return 'border-zinc-700 bg-zinc-800';
}

export function getElapsedBadgeVariant(minutes: number): string {
  if (minutes >= 10) return 'bg-red-600 text-white';
  if (minutes >= 5) return 'bg-yellow-600 text-white';
  return 'bg-zinc-700 text-zinc-300';
}

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
