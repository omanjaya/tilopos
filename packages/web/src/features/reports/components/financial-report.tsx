import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/api/endpoints/reports.api';
import { MetricCard } from '@/components/shared/metric-card';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { DollarSign, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import type { DateRange } from '@/types/report.types';

interface FinancialReportProps {
  outletId: string;
  dateRange: DateRange;
}

export function FinancialReport({ outletId, dateRange }: FinancialReportProps) {
  const { data: financialReport, isLoading } = useQuery({
    queryKey: ['reports', 'financial', outletId, dateRange],
    queryFn: () => reportsApi.financial({ outletId, dateRange }),
    enabled: !!outletId,
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <MetricCard
              title="Pendapatan"
              value={formatCurrency(financialReport?.totalRevenue ?? 0)}
              icon={DollarSign}
            />
            <MetricCard
              title="HPP (Cost)"
              value={formatCurrency(financialReport?.totalCost ?? 0)}
              icon={TrendingDown}
            />
            <MetricCard
              title="Laba Kotor"
              value={formatCurrency(financialReport?.grossProfit ?? 0)}
              icon={TrendingUp}
            />
            <MetricCard
              title="Margin"
              value={`${Number(financialReport?.grossMargin ?? 0).toFixed(1)}%`}
              icon={Percent}
            />
          </>
        )}
      </div>
    </div>
  );
}
