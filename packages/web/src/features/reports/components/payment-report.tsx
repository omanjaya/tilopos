import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/api/endpoints/reports.api';
import { MetricCard } from '@/components/shared/metric-card';
import { DataTable } from '@/components/shared/data-table';
import type { Column } from '@/components/shared/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { CreditCard } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { DateRange, PaymentMethodBreakdown } from '@/types/report.types';

interface PaymentReportProps {
  outletId: string;
  dateRange: DateRange;
}

const PIE_COLORS = [
  'hsl(var(--primary))',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
];

const columns: Column<PaymentMethodBreakdown>[] = [
  {
    key: 'method',
    header: 'Metode Bayar',
    cell: (row) => <span className="font-medium">{row.method}</span>,
  },
  {
    key: 'count',
    header: 'Jumlah Transaksi',
    cell: (row) => row.count,
  },
  {
    key: 'amount',
    header: 'Total',
    cell: (row) => formatCurrency(row.amount),
  },
  {
    key: 'percentage',
    header: 'Persentase',
    cell: (row) => `${Number(row.percentage ?? 0).toFixed(1)}%`,
  },
];

export function PaymentReport({ outletId, dateRange }: PaymentReportProps) {
  const { data: paymentReport, isLoading } = useQuery({
    queryKey: ['reports', 'payment-methods', outletId, dateRange],
    queryFn: () => reportsApi.paymentMethods({ outletId, dateRange }),
    enabled: !!outletId,
  });

  const methods = paymentReport?.methods ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ) : (
          <MetricCard
            title="Total Pembayaran"
            value={formatCurrency(paymentReport?.totalAmount ?? 0)}
            icon={CreditCard}
          />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribusi Metode Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={methods}
                  dataKey="percentage"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  outerRadius={150}
                  label={({ method, percentage }: { method: string; percentage: number }) =>
                    `${method} (${Number(percentage ?? 0).toFixed(1)}%)`
                  }
                >
                  {methods.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${Number(value ?? 0).toFixed(1)}%`, name]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detail Metode Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={methods}
            isLoading={isLoading}
            emptyTitle="Tidak ada data pembayaran"
            emptyDescription="Belum ada transaksi pembayaran untuk periode ini."
          />
        </CardContent>
      </Card>
    </div>
  );
}
