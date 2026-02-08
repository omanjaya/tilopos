import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '@/api/endpoints/transactions.api';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { MoreHorizontal, Eye, XCircle, RotateCcw, Printer, Loader2 } from 'lucide-react';
import type { Transaction, TransactionStatus } from '@/types/transaction.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

const STATUS_MAP: Record<TransactionStatus, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
  completed: { label: 'Selesai', variant: 'default' },
  voided: { label: 'Void', variant: 'destructive' },
  refunded: { label: 'Refund', variant: 'outline' },
  held: { label: 'Ditahan', variant: 'secondary' },
  partial_refund: { label: 'Refund Sebagian', variant: 'secondary' },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
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

function getPaymentMethodLabels(transaction: Transaction): string {
  const payments = transaction.payments ?? [];
  if (payments.length === 0) return '-';
  return payments
    .map((p) => PAYMENT_METHOD_LABELS[p.method] || p.method)
    .join(', ');
}

export function TransactionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [voidTarget, setVoidTarget] = useState<Transaction | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [refundTarget, setRefundTarget] = useState<Transaction | null>(null);
  const [refundReason, setRefundReason] = useState('');

  // Get outlet context - fixes data inconsistency issue
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const user = useAuthStore((s) => s.user);
  const outletId = selectedOutletId ?? user?.outletId;

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['transactions', outletId, search, statusFilter, startDate, endDate],
    queryFn: () =>
      transactionsApi.list({
        outletId: outletId || undefined, // Convert null to undefined for type safety
        search: search || undefined,
        status: statusFilter !== 'all' ? (statusFilter as TransactionStatus) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    enabled: !!outletId, // Only fetch when outletId is available
  });


  const voidMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => transactionsApi.void(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: 'Transaksi berhasil di-void' });
      setVoidTarget(null);
      setVoidReason('');
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal void transaksi',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const refundMutation = useMutation({
    mutationFn: (data: { transactionId: string; items: { transactionItemId: string; quantity: number }[]; reason: string }) =>
      transactionsApi.refund(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: 'Refund berhasil diproses' });
      setRefundTarget(null);
      setRefundReason('');
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal memproses refund',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const handleReprint = async (id: string) => {
    try {
      await transactionsApi.reprint(id);
      toast({ title: 'Struk berhasil dicetak ulang' });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Gagal cetak ulang',
        description: 'Terjadi kesalahan saat mencetak ulang struk',
      });
    }
  };

  const columns: Column<Transaction>[] = [
    {
      key: 'transactionNumber',
      header: 'No. Transaksi',
      cell: (row) => <span className="font-medium">{row.transactionNumber}</span>,
    },
    {
      key: 'createdAt',
      header: 'Tanggal',
      cell: (row) => <span className="text-muted-foreground">{formatDateTime(row.createdAt)}</span>,
    },
    {
      key: 'employeeName',
      header: 'Kasir',
      cell: (row) => row.employeeName,
    },
    {
      key: 'totalAmount',
      header: 'Total',
      cell: (row) => <span className="font-medium">{formatCurrency(row.totalAmount)}</span>,
    },
    {
      key: 'paymentMethod',
      header: 'Metode Bayar',
      cell: (row) => (
        <span className="text-muted-foreground">{getPaymentMethodLabels(row)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const status = STATUS_MAP[row.status] ?? { label: row.status, variant: 'secondary' as const };
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
    {
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
    },
  ];

  return (
    <div>
      <PageHeader title="Riwayat Transaksi" description="Lihat semua transaksi" />

      <DataTable
        columns={columns}
        data={transactionsData ?? []}
        isLoading={isLoading}
        searchPlaceholder="Cari no. transaksi atau nama pelanggan..."
        onSearch={setSearch}
        emptyTitle="Belum ada transaksi"
        emptyDescription="Transaksi akan muncul di sini setelah Anda melakukan penjualan."
        filters={
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="completed">Selesai</SelectItem>
                <SelectItem value="voided">Void</SelectItem>
                <SelectItem value="refunded">Refund</SelectItem>
                <SelectItem value="partial_refund">Refund Sebagian</SelectItem>
                <SelectItem value="held">Ditahan</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[160px]"
              placeholder="Dari tanggal"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[160px]"
              placeholder="Sampai tanggal"
            />
          </div>
        }
      />

      {/* Void Dialog */}
      <Dialog open={!!voidTarget} onOpenChange={(open) => { if (!open) { setVoidTarget(null); setVoidReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Transaksi</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin void transaksi "{voidTarget?.transactionNumber}"? Tindakan ini tidak dapat dibatalkan.
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
              Refund seluruh item dari transaksi "{refundTarget?.transactionNumber}".
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
