import { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CookingTimerProps {
  startTime: string; // ISO date when order was received
  targetMinutes?: number; // SLA in minutes (default 15)
}

function getElapsedSeconds(startTime: string): number {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - start) / 1000));
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

type TimerPhase = 'on-track' | 'warning' | 'overdue';

function getTimerPhase(elapsedSeconds: number, targetMinutes: number): TimerPhase {
  const targetSeconds = targetMinutes * 60;
  const ratio = elapsedSeconds / targetSeconds;
  if (ratio > 1) return 'overdue';
  if (ratio >= 0.5) return 'warning';
  return 'on-track';
}

const phaseStyles: Record<TimerPhase, string> = {
  'on-track': 'text-green-400 bg-green-950/50 border-green-800',
  warning: 'text-yellow-400 bg-yellow-950/50 border-yellow-800',
  overdue: 'text-red-400 bg-red-950/50 border-red-800 animate-pulse',
};

const phaseIconStyles: Record<TimerPhase, string> = {
  'on-track': 'text-green-400',
  warning: 'text-yellow-400',
  overdue: 'text-red-400',
};

export function CookingTimer({ startTime, targetMinutes = 15 }: CookingTimerProps) {
  const [elapsed, setElapsed] = useState(() => getElapsedSeconds(startTime));

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(getElapsedSeconds(startTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const phase = getTimerPhase(elapsed, targetMinutes);
  const targetSeconds = targetMinutes * 60;
  const isOverdue = elapsed > targetSeconds;
  const overdueSecs = isOverdue ? elapsed - targetSeconds : 0;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs font-bold tabular-nums',
        phaseStyles[phase],
      )}
    >
      <Timer className={cn('h-3.5 w-3.5', phaseIconStyles[phase])} />
      <span>{formatTime(elapsed)}</span>
      {isOverdue && (
        <span className="text-[10px] font-semibold text-red-400">
          (+{formatTime(overdueSecs)})
        </span>
      )}
    </div>
  );
}
