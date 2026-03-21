import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { transactionsApi } from '@/api/endpoints/transactions.api';
import { settingsApi } from '@/api/endpoints/settings.api';
import { DataTable, type Column } from '@/components/shared/data-table';
import { ExportButtons } from '@/components/shared/export-buttons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
import { usePaginatedList } from '@/hooks/use-paginated-list';
import { formatCurrency, formatTime } from '@/lib/format';
import { generateFilename } from '@/lib/export-utils';
import { useAuthStore } from '@/stores/auth.store';
import {
  MoreHorizontal, Eye, XCircle, RotateCcw, Printer, Loader2,
  Receipt, TrendingUp, ShoppingCart, Ban, Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/types/transaction.types';

// ── Types ────────────────────────────────────────────────────────────────────

interface VoidItemRow {
  id: string;
  voidTime: string;
  orderId: string;
  itemName: string;
  quantity: number;
  voidReason: string;
  voidedBy: string;
  totalPrice: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

type TabId = 'all' | 'completed' | 'cancelled' | 'voided';

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'Transaksi' },
  { id: 'completed', label: 'Pesanan Sukses' },
  { id: 'cancelled', label: 'Pesanan Batal' },
  { id: 'voided', label: 'Item Void' },
];

// ── Component ────────────────────────────────────────────────────────────────

export function TransactionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const outletName = useAuthStore((s) => s.user?.outletName);

  // Filters
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [outletFilter, setOutletFilter] = useState<string>('all');

  // Dialogs
  const [voidTarget, setVoidTarget] = useState<Transaction | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [refundTarget, setRefundTarget] = useState<Transaction | null>(null);
  const [refundReason, setRefundReason] = useState('');

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: outlets } = useQuery({
    queryKey: ['outlets'],
    queryFn: () => settingsApi.getOutlets(),
  });

  // Map status tab → API param
  const statusParam =
    activeTab === 'all' ? undefined
      : activeTab === 'cancelled' ? ('refunded' as const)
        : activeTab;

  const filters = useMemo(() => ({
    outletId: outletFilter !== 'all' ? outletFilter : undefined,
    status: statusParam,
    startDate: selectedDate,
    endDate: selectedDate,
  }), [outletFilter, statusParam, selectedDate]);

  const { data: transactionsData, isLoading, pagination, sort, setSearch } = usePaginatedList<Transaction>({
    queryKey: ['transactions'],
    queryFn: (params) => transactionsApi.listPaginated({ ...params, ...filters }),
    filters,
    defaultLimit: 20,
  });

  // ── Computed ─────────────────────────────────────────────────────────────

  const outletMap = useMemo(() => {
    const map = new Map<string, string>();
    outlets?.forEach((o) => map.set(o.id, o.name));
    return map;
  }, [outlets]);

  const transactions = transactionsData;

  // For "cancelled" tab, include both refunded and partial_refund
  const filtered = activeTab === 'cancelled'
    ? transactions.filter((t) => t.status === 'refunded' || t.status === 'partial_refund')
    : transactions;

  // Flatten voided transaction items for "Item Void" tab
  const voidItems = useMemo<VoidItemRow[]>(() => {
    if (activeTab !== 'voided') return [];
    const rows: VoidItemRow[] = [];
    for (const tx of filtered) {
      for (const item of tx.items ?? []) {
        rows.push({
          id: `${tx.id}-${item.id}`,
          voidTime: tx.voidedAt ?? tx.updatedAt,
          orderId: tx.transactionNumber,
          itemName: item.variantName
            ? `${item.productName} (${item.variantName})`
            : item.productName,
          quantity: item.quantity,
          voidReason: tx.voidReason || '-',
          voidedBy: tx.voidedBy ?? tx.employeeName,
          totalPrice: item.totalPrice,
        });
      }
    }
    return rows;
  }, [activeTab, filtered]);

  const summary = useMemo(() => {
    if (activeTab === 'voided') {
      return {
        count: voidItems.length,
        totalCollected: voidItems.reduce((s, item) => s + item.totalPrice, 0),
        netSales: 0,
      };
    }
    return {
      count: filtered.length,
      totalCollected: filtered.reduce((s, t) => s + t.totalAmount, 0),
      netSales: filtered.reduce((s, t) => s + t.totalAmount - t.discountAmount, 0),
    };
  }, [activeTab, filtered, voidItems]);

  // ── Mutations ────────────────────────────────────────────────────────────

  const voidMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => transactionsApi.void(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success({ title: 'Transaksi berhasil di-void' });
      setVoidTarget(null);
      setVoidReason('');
    },
    onError: (error) => handleMutationError(error, 'Gagal void transaksi'),
  });

  const refundMutation = useMutation({
    mutationFn: (data: { transactionId: string; items: { transactionItemId: string; quantity: number }[]; reason: string }) =>
      transactionsApi.refund(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success({ title: 'Refund berhasil diproses' });
      setRefundTarget(null);
      setRefundReason('');
    },
    onError: (error) => handleMutationError(error, 'Gagal memproses refund'),
  });

  const handleReprint = async (id: string) => {
    try {
      await transactionsApi.reprint(id);
      toast.success({ title: 'Struk berhasil dicetak ulang' });
    } catch {
      toast.error({
        title: 'Gagal cetak ulang',
        description: 'Terjadi kesalahan saat mencetak ulang struk',
      });
    }
  };

  // ── Action Column (shared for transaction tabs) ─────────────────────────

  const actionColumn: Column<Transaction> = {
    key: 'actions',
    header: '',
    cell: (row) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Aksi transaksi">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => navigate(`/app/transactions/${row.id}`)}>
            <Eye className="mr-2 h-4 w-4" /> Lihat Detail
          </DropdownMenuItem>
          {row.status === 'completed' && (
            <DropdownMenuItem
              onClick={() => setVoidTarget(row)}
              className="text-destructive"
            >
              <XCircle className="mr-2 h-4 w-4" /> Void
            </DropdownMenuItem>
          )}
          {row.status === 'completed' && (
            <DropdownMenuItem onClick={() => setRefundTarget(row)}>
              <RotateCcw className="mr-2 h-4 w-4" /> Refund
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => handleReprint(row.id)}>
            <Printer className="mr-2 h-4 w-4" /> Cetak Ulang
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  };

  // ── Per-Tab Columns ────────────────────────────────────────────────────

  const defaultColumns: Column<Transaction>[] = [
    {
      key: 'outlet',
      header: 'Outlet',
      cell: (row) => outletMap.get(row.outletId) || '-',
    },
    {
      key: 'time',
      header: 'Waktu',
      cell: (row) => <span className="text-muted-foreground">{formatTime(row.createdAt)}</span>,
    },
    {
      key: 'employeeName',
      header: 'Diproses Oleh',
      cell: (row) => row.employeeName,
    },
    {
      key: 'items',
      header: 'Item',
      cell: (row) => row.items?.length ?? 0,
    },
    {
      key: 'totalAmount',
      header: 'Total Harga',
      sortable: true,
      cell: (row) => <span className="font-medium">{formatCurrency(row.totalAmount)}</span>,
    },
    actionColumn,
  ];

  const cancelledColumns: Column<Transaction>[] = [
    {
      key: 'outlet',
      header: 'Outlet',
      cell: (row) => outletMap.get(row.outletId) || '-',
    },
    {
      key: 'cancelledTime',
      header: 'Waktu Batal',
      cell: (row) => (
        <span className="text-muted-foreground">
          {formatTime(row.voidedAt ?? row.updatedAt)}
        </span>
      ),
    },
    {
      key: 'cancelledBy',
      header: 'Dibatalkan Oleh',
      cell: (row) => row.voidedBy ?? row.employeeName,
    },
    {
      key: 'cancelReason',
      header: 'Alasan Batal',
      cell: (row) => (
        <span className="text-muted-foreground text-sm">
          {row.voidReason || '-'}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total Harga',
      cell: (row) => <span className="font-medium">{formatCurrency(row.totalAmount)}</span>,
    },
    actionColumn,
  ];

  const voidItemColumns: Column<VoidItemRow>[] = [
    {
      key: 'voidTime',
      header: 'Waktu Void',
      cell: (row) => <span className="text-muted-foreground">{formatTime(row.voidTime)}</span>,
    },
    {
      key: 'orderId',
      header: 'Order ID',
      cell: (row) => <span className="font-medium">{row.orderId}</span>,
    },
    {
      key: 'itemName',
      header: 'Nama Item',
      cell: (row) => row.itemName,
    },
    {
      key: 'quantity',
      header: 'Qty',
      cell: (row) => row.quantity,
    },
    {
      key: 'voidReason',
      header: 'Alasan Void',
      cell: (row) => (
        <span className="text-muted-foreground text-sm">{row.voidReason}</span>
      ),
    },
    {
      key: 'voidedBy',
      header: 'Di-void Oleh',
      cell: (row) => row.voidedBy,
    },
    {
      key: 'totalPrice',
      header: 'Total Harga',
      cell: (row) => <span className="font-medium">{formatCurrency(row.totalPrice)}</span>,
    },
  ];

  // ── Per-Tab Summary Cards ──────────────────────────────────────────────

  function renderSummaryCards() {
    if (activeTab === 'cancelled') {
      return (
        <div className="grid grid-cols-2 gap-4">
          <SummaryCard icon={Receipt} label="TRANSAKSI" value={summary.count.toString()} />
          <SummaryCard icon={Ban} label="TOTAL DIBATALKAN" value={formatCurrency(summary.totalCollected)} />
        </div>
      );
    }
    if (activeTab === 'voided') {
      return (
        <div className="grid grid-cols-2 gap-4">
          <SummaryCard icon={Package} label="TOTAL ITEM VOID" value={summary.count.toString()} />
          <SummaryCard icon={XCircle} label="TOTAL HARGA VOID" value={formatCurrency(summary.totalCollected)} />
        </div>
      );
    }
    // "all" and "completed" tabs
    return (
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard icon={Receipt} label="TRANSAKSI" value={summary.count.toString()} />
        <SummaryCard icon={ShoppingCart} label="TOTAL TERKUMPUL" value={formatCurrency(summary.totalCollected)} />
        <SummaryCard icon={TrendingUp} label="PENJUALAN BERSIH" value={formatCurrency(summary.netSales)} />
      </div>
    );
  }

  // ── Export Data ──────────────────────────────────────────────────────────

  const exportFilename = generateFilename('transaksi', selectedDate);

  function getExportProps() {
    if (activeTab === 'voided') {
      return {
        headers: ['Waktu Void', 'Order ID', 'Nama Item', 'Qty', 'Alasan Void', 'Di-void Oleh', 'Total Harga'],
        data: voidItems.map((r) => [
          formatTime(r.voidTime),
          r.orderId,
          r.itemName,
          r.quantity,
          r.voidReason,
          r.voidedBy,
          formatCurrency(r.totalPrice),
        ]),
        summary: [
          { label: 'Total Item Void', value: summary.count },
          { label: 'Total Harga Void', value: formatCurrency(summary.totalCollected) },
        ],
      };
    }
    if (activeTab === 'cancelled') {
      return {
        headers: ['Outlet', 'Waktu Batal', 'Dibatalkan Oleh', 'Alasan Batal', 'Total Harga'],
        data: filtered.map((t) => [
          outletMap.get(t.outletId) || '-',
          formatTime(t.voidedAt ?? t.updatedAt),
          t.voidedBy ?? t.employeeName,
          t.voidReason || '-',
          formatCurrency(t.totalAmount),
        ]),
        summary: [
          { label: 'Transaksi', value: summary.count },
          { label: 'Total Dibatalkan', value: formatCurrency(summary.totalCollected) },
        ],
      };
    }
    return {
      headers: ['Outlet', 'Waktu', 'No. Transaksi', 'Diproses Oleh', 'Item', 'Total Harga'],
      data: filtered.map((t) => [
        outletMap.get(t.outletId) || '-',
        formatTime(t.createdAt),
        t.transactionNumber,
        t.employeeName,
        t.items?.length ?? 0,
        formatCurrency(t.totalAmount),
      ]),
      summary: [
        { label: 'Transaksi', value: summary.count },
        { label: 'Total Terkumpul', value: formatCurrency(summary.totalCollected) },
        { label: 'Penjualan Bersih', value: formatCurrency(summary.netSales) },
      ],
    };
  }

  const exportProps = getExportProps();

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={outletFilter} onValueChange={setOutletFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Semua Outlet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Outlet</SelectItem>
            {outlets?.map((outlet) => (
              <SelectItem key={outlet.id} value={outlet.id}>
                {outlet.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-[160px]"
        />

        <div className="ml-auto">
          <ExportButtons
            title="Laporan Transaksi"
            headers={exportProps.headers}
            data={exportProps.data}
            filename={exportFilename}
            summary={exportProps.summary}
            outletName={outletName}
            period={selectedDate}
            columnStyles={{ [exportProps.headers.length - 1]: { halign: 'right' } }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Data Table — void tab uses different data type */}
      {activeTab === 'voided' ? (
        <DataTable
          columns={voidItemColumns}
          data={voidItems}
          isLoading={isLoading}
          searchPlaceholder="Cari nama item..."
          onSearch={setSearch}
          emptyTitle="Data Tidak Ditemukan"
          emptyDescription="Item void akan muncul di sini."
        />
      ) : (
        <DataTable
          columns={activeTab === 'cancelled' ? cancelledColumns : defaultColumns}
          data={filtered}
          isLoading={isLoading}
          searchPlaceholder="Cari no. receipt..."
          onSearch={setSearch}
          pagination={pagination}
          sort={sort}
          emptyTitle="Data Tidak Ditemukan"
          emptyDescription="Transaksi akan muncul di sini setelah ada penjualan."
        />
      )}

      {/* Void Dialog */}
      <Dialog open={!!voidTarget} onOpenChange={(open) => { if (!open) { setVoidTarget(null); setVoidReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Transaksi</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin void transaksi &quot;{voidTarget?.transactionNumber}&quot;? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="void-reason">Alasan Void</Label>
            <Textarea
              id="void-reason"
              placeholder="Masukkan alasan void..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setVoidTarget(null); setVoidReason(''); }}
              disabled={voidMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => voidTarget && voidMutation.mutate({ id: voidTarget.id, reason: voidReason })}
              disabled={voidMutation.isPending || !voidReason.trim()}
              aria-busy={voidMutation.isPending}
              aria-label={voidMutation.isPending ? 'Voiding transaction...' : undefined}
            >
              {voidMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Void Transaksi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={!!refundTarget} onOpenChange={(open) => { if (!open) { setRefundTarget(null); setRefundReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund Transaksi</DialogTitle>
            <DialogDescription>
              Refund seluruh item dari transaksi &quot;{refundTarget?.transactionNumber}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="refund-reason">Alasan Refund</Label>
            <Textarea
              id="refund-reason"
              placeholder="Masukkan alasan refund..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setRefundTarget(null); setRefundReason(''); }}
              disabled={refundMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                refundTarget &&
                refundMutation.mutate({
                  transactionId: refundTarget.id,
                  items: (refundTarget.items ?? []).map((item) => ({
                    transactionItemId: item.id,
                    quantity: item.quantity,
                  })),
                  reason: refundReason,
                })
              }
              disabled={refundMutation.isPending || !refundReason.trim()}
              aria-busy={refundMutation.isPending}
              aria-label={refundMutation.isPending ? 'Processing refund...' : undefined}
            >
              {refundMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Proses Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
