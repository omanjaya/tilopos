import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/format';
import { reportsApi } from '@/api/endpoints/reports.api';

interface CollectedBySectionProps {
  outletId: string;
  startDate: string;
  endDate: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  supervisor: 'Supervisor',
  cashier: 'Kasir',
  kitchen: 'Dapur',
  inventory: 'Inventori',
};

export function CollectedBySection({ outletId, startDate, endDate }: CollectedBySectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['report', 'employee-sales', outletId, startDate, endDate],
    queryFn: () => reportsApi.employeeSales({ outletId, startDate, endDate }),
    enabled: !!outletId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  if (!data || !data.employees.length) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Tidak ada data kasir untuk periode ini</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-base font-semibold">Dikumpulkan Oleh Kasir</h3>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Karyawan</p>
            <p className="mt-1 text-xl font-semibold">{formatNumber(data.summary.totalEmployees)}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Penjualan</p>
            <p className="mt-1 text-xl font-semibold">{formatCurrency(data.summary.totalSales)}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Transaksi</p>
            <p className="mt-1 text-xl font-semibold">{formatNumber(data.summary.totalTransactions)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-b px-4 py-2.5 text-xs font-medium text-muted-foreground">
          <span>Karyawan</span>
          <span className="text-right">Transaksi</span>
          <span className="text-right">Penjualan</span>
          <span className="hidden text-right sm:block">Rata-rata</span>
        </div>
        {data.employees.map((emp) => (
          <div key={emp.employeeId} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-b px-4 py-2.5 last:border-0">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{emp.employeeName}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABELS[emp.role] || emp.role}</p>
            </div>
            <span className="text-right text-sm tabular-nums text-muted-foreground">{formatNumber(emp.transactionCount)}</span>
            <span className="text-right text-sm tabular-nums">{formatCurrency(emp.totalSales)}</span>
            <span className="hidden text-right text-sm tabular-nums text-muted-foreground sm:block">{formatCurrency(emp.averageTransaction)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
