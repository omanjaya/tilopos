import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendIndicator } from './trend-indicator';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  className?: string;
  /** Current period value (numeric, for trend calculation) */
  currentValue?: number;
  /** Previous period value (numeric, for trend calculation) */
  previousValue?: number;
  /** Invert trend colors (e.g., cost metrics where down is good) */
  invertTrend?: boolean;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  description,
  className,
  currentValue,
  previousValue,
  invertTrend,
}: MetricCardProps) {
  const showTrend = currentValue !== undefined && previousValue !== undefined;

  return (
    <Card className={cn('group cursor-default', className)}>
      <CardContent className="flex items-center gap-3 p-4 md:gap-4 md:p-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-all duration-200 group-hover:bg-primary/20 group-hover:scale-110 md:h-12 md:w-12">
          <Icon className="h-5 w-5 text-primary transition-transform duration-200 group-hover:scale-110 md:h-6 md:w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground md:text-sm">{title}</p>
          <p className="text-lg font-bold md:text-2xl">{value}</p>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          {showTrend && (
            <div className="mt-2">
              <TrendIndicator
                current={currentValue}
                previous={previousValue}
                invertColors={invertTrend}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
