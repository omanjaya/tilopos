import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invoicesApi, type ItemSummaryItem } from '@/api/endpoints/invoices.api';
import { DataTable, type Column } from '@/components/shared/data-table';
import { formatCurrency, formatNumber } from '@/lib/format';
import { Package, Hash, TrendingUp } from 'lucide-react';

interface ItemDetailsTabProps {
  outletId: string;
  startDate: string;
  endDate: string;
}

export function ItemDetailsTab({ outletId, startDate, endDate }: ItemDetailsTabProps) {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['invoices-items', outletId, startDate, endDate, search],
    queryFn: () =>
      invoicesApi.itemsSummary({
        outletId,
        startDate,
        endDate,
        search: search || undefined,
      }),
    enabled: !!outletId,
  });

  const columns: Column<ItemSummaryItem>[] = [
    {
      key: 'productName',
      header: 'Produk',
      cell: (row) => <span className="font-medium">{row.productName}</span>,
    },
    {
      key: 'variantName',
      header: 'Varian',
      cell: (row) => row.variantName || <span className="text-muted-foreground">-</span>,
    },
    {
      key: 'totalQuantity',
      header: 'Qty Terjual',
      cell: (row) => formatNumber(row.totalQuantity),
    },
    {
      key: 'totalRevenue',
      header: 'Revenue',
      cell: (row) => <span className="font-semibold">{formatCurrency(row.totalRevenue)}</span>,
    },
    {
      key: 'averagePrice',
      header: 'Rata-rata Harga',
      cell: (row) => formatCurrency(row.averagePrice),
    },
    {
      key: 'transactionCount',
      header: 'Jml Transaksi',
      cell: (row) => formatNumber(row.transactionCount),
    },
  ];

  const summary = data?.summary;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard icon={Package} label="Total Produk" value={formatNumber(summary.totalItems)} />
          <SummaryCard icon={Hash} label="Total Qty" value={formatNumber(summary.totalQuantity)} />
          <SummaryCard icon={TrendingUp} label="Total Revenue" value={formatCurrency(summary.totalRevenue)} />
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        searchPlaceholder="Cari nama produk..."
        onSearch={setSearch}
        emptyTitle="Belum ada data item"
        emptyDescription="Data item akan muncul setelah ada transaksi penjualan yang selesai."
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
