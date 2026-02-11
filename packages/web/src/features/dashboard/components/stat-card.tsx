import { type LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { calculatePercentageChange, formatPercentageChange } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

const COLOR_CONFIG = {
  emerald: {
    accent: 'from-emerald-400 to-emerald-600',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    sparkline: '#10b981',
  },
  blue: {
    accent: 'from-blue-400 to-blue-600',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    sparkline: '#3b82f6',
  },
  amber: {
    accent: 'from-amber-400 to-amber-600',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    sparkline: '#f59e0b',
  },
  violet: {
    accent: 'from-violet-400 to-violet-600',
    iconBg: 'bg-violet-100 dark:bg-violet-900/40',
    iconColor: 'text-violet-600 dark:text-violet-400',
    sparkline: '#8b5cf6',
  },
} as const;

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color: keyof typeof COLOR_CONFIG;
  current?: number;
  previous?: number;
  sparklineData?: number[];
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  color,
  current,
  previous,
  sparklineData,
  className,
}: StatCardProps) {
  const c = COLOR_CONFIG[color];
  const change = calculatePercentageChange(current, previous);
  const isUp = change > 0.01;
  const isDown = change < -0.01;
  const hasTrend = current !== undefined && previous !== undefined;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl',
        'bg-white/80 dark:bg-card/80',
        'backdrop-blur-sm',
        'border border-border/50 dark:border-white/[0.06]',
        'shadow-sm hover:shadow-md',
        'transition-all duration-300',
        className,
      )}
    >
      {/* Left accent gradient */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b', c.accent)} />

      <div className="p-5 pl-5">
        <div className="flex items-start justify-between">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', c.iconBg)}>
            <Icon className={cn('h-5 w-5', c.iconColor)} />
          </div>

          {/* Sparkline */}
          {sparklineData && sparklineData.length > 1 && (
            <div className="h-8 w-20 opacity-60 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData.map((v) => ({ v }))}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke={c.sparkline}
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="mt-3">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-0.5 text-2xl font-bold tracking-tight">{value}</p>
        </div>

        {/* Real trend indicator */}
        {hasTrend && (
          <div className="mt-2 flex items-center gap-1">
            <div
              className={cn(
                'flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
                isUp && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
                isDown && 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
                !isUp && !isDown && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
              )}
            >
              {isUp && <ArrowUpRight className="h-3 w-3" />}
              {isDown && <ArrowDownRight className="h-3 w-3" />}
              {formatPercentageChange(change)}
            </div>
            <span className="text-xs text-muted-foreground">vs sebelumnya</span>
          </div>
        )}
      </div>
    </div>
  );
}
