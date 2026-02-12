import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invoicesApi, type TransactionSummaryItem } from '@/api/endpoints/invoices.api';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/format';

interface TransactionsTabProps {
  outletId: string;
  startDate: string;
  endDate: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  debit_card: 'Kartu Debit',
  credit_card: 'Kartu Kredit',
  gopay: 'GoPay',
  ovo: 'OVO',
  dana: 'DANA',
  shopeepay: 'ShopeePay',
  linkaja: 'LinkAja',
};

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
  completed: { label: 'Selesai', variant: 'default' },
  voided: { label: 'Void', variant: 'destructive' },
  refunded: { label: 'Refund', variant: 'outline' },
  held: { label: 'Ditahan', variant: 'secondary' },
  partial_refund: { label: 'Refund Sebagian', variant: 'secondary' },
};

export function TransactionsTab({ outletId, startDate, endDate }: TransactionsTabProps) {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['invoices-transactions', outletId, startDate, endDate, search],
    queryFn: () =>
      invoicesApi.transactions({
        outletId,
        startDate,
        endDate,
        search: search || undefined,
      }),
    enabled: !!outletId,
  });

  const columns: Column<TransactionSummaryItem>[] = [
    {
      key: 'receiptNumber',
      header: 'No. Transaksi',
      cell: (row) => <span className="font-medium">{row.receiptNumber}</span>,
    },
    {
      key: 'date',
      header: 'Tanggal',
      cell: (row) => <span className="text-muted-foreground">{formatDateTime(row.date)}</span>,
    },
    {
      key: 'employeeName',
      header: 'Kasir',
      cell: (row) => row.employeeName,
    },
    {
      key: 'customerName',
      header: 'Pelanggan',
      cell: (row) => row.customerName || <span className="text-muted-foreground">-</span>,
    },
    {
      key: 'grandTotal',
      header: 'Total',
      cell: (row) => <span className="font-semibold">{formatCurrency(row.grandTotal)}</span>,
    },
    {
      key: 'paymentMethods',
      header: 'Metode Bayar',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.paymentMethods.map((m) => PAYMENT_LABELS[m] || m).join(', ') || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const s = STATUS_MAP[row.status] ?? { label: row.status, variant: 'secondary' as const };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
  ];

  const dailySummary = data?.dailySummary ?? [];

  return (
    <div className="space-y-4">
      {/* Daily summary */}
      {dailySummary.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-medium">Ringkasan Harian</h3>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Tanggal</th>
                  <th className="px-4 py-2 text-right font-medium">Transaksi</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {dailySummary.map((day) => (
                  <tr key={day.date} className="border-b last:border-0">
                    <td className="px-4 py-2">{formatDate(day.date)}</td>
                    <td className="px-4 py-2 text-right">{day.count}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatCurrency(day.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions table */}
      <DataTable
        columns={columns}
        data={data?.transactions ?? []}
        isLoading={isLoading}
        searchPlaceholder="Cari no. transaksi..."
        onSearch={setSearch}
        emptyTitle="Belum ada transaksi"
        emptyDescription="Transaksi akan muncul setelah ada penjualan."
      />
    </div>
  );
}
