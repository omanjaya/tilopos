import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invoicesApi, type InvoiceItem } from '@/api/endpoints/invoices.api';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { FileText, Receipt, Percent, Calculator } from 'lucide-react';

interface InvoiceTabProps {
  outletId: string;
  startDate: string;
  endDate: string;
  onSelectInvoice: (invoiceId: string) => void;
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
  completed: { label: 'Selesai', variant: 'default' },
  voided: { label: 'Void', variant: 'destructive' },
  refunded: { label: 'Refund', variant: 'outline' },
  held: { label: 'Ditahan', variant: 'secondary' },
  partial_refund: { label: 'Refund Sebagian', variant: 'secondary' },
};

export function InvoiceTab({ outletId, startDate, endDate, onSelectInvoice }: InvoiceTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', outletId, startDate, endDate, search, statusFilter],
    queryFn: () =>
      invoicesApi.list({
        outletId,
        startDate,
        endDate,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
    enabled: !!outletId,
  });

  const columns: Column<InvoiceItem>[] = [
    {
      key: 'invoiceNumber',
      header: 'No. Invoice',
      cell: (row) => (
        <button
          className="font-medium text-primary hover:underline text-left"
          onClick={() => onSelectInvoice(row.id)}
        >
          {row.invoiceNumber}
        </button>
      ),
    },
    {
      key: 'date',
      header: 'Tanggal',
      cell: (row) => <span className="text-muted-foreground">{formatDateTime(row.date)}</span>,
    },
    {
      key: 'customerName',
      header: 'Pelanggan',
      cell: (row) => row.customerName || <span className="text-muted-foreground">-</span>,
    },
    {
      key: 'employeeName',
      header: 'Kasir',
      cell: (row) => row.employeeName,
    },
    {
      key: 'itemCount',
      header: 'Item',
      cell: (row) => row.itemCount,
    },
    {
      key: 'subtotal',
      header: 'Subtotal',
      cell: (row) => formatCurrency(row.subtotal),
    },
    {
      key: 'discount',
      header: 'Diskon',
      cell: (row) =>
        row.discount > 0 ? (
          <span className="text-red-500">-{formatCurrency(row.discount)}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: 'tax',
      header: 'Pajak',
      cell: (row) => (row.tax > 0 ? formatCurrency(row.tax) : <span className="text-muted-foreground">-</span>),
    },
    {
      key: 'grandTotal',
      header: 'Total',
      cell: (row) => <span className="font-semibold">{formatCurrency(row.grandTotal)}</span>,
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

  const summary = data?.summary;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryCard icon={FileText} label="Total Invoice" value={summary.totalInvoices.toString()} />
          <SummaryCard icon={Receipt} label="Total Amount" value={formatCurrency(summary.totalAmount)} />
          <SummaryCard icon={Calculator} label="Total Pajak" value={formatCurrency(summary.totalTax)} />
          <SummaryCard icon={Percent} label="Total Diskon" value={formatCurrency(summary.totalDiscount)} />
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.invoices ?? []}
        isLoading={isLoading}
        searchPlaceholder="Cari no. invoice atau nama pelanggan..."
        onSearch={setSearch}
        emptyTitle="Belum ada invoice"
        emptyDescription="Invoice akan muncul setelah ada transaksi penjualan."
        filters={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="completed">Selesai</SelectItem>
              <SelectItem value="voided">Void</SelectItem>
              <SelectItem value="refunded">Refund</SelectItem>
              <SelectItem value="partial_refund">Refund Sebagian</SelectItem>
            </SelectContent>
          </Select>
        }
      />
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
