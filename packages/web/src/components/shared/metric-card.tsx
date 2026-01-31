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
    <Card className={cn(className)}>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
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
