import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settlementsApi } from '@/api/endpoints/settlements.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { MetricCard } from '@/components/shared/metric-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { Banknote, CheckCircle2, Clock, XCircle, Eye, Loader2 } from 'lucide-react';
import type { Settlement } from '@/types/settlement.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
  pending: { label: 'Tertunda', variant: 'secondary' },
  settled: { label: 'Selesai', variant: 'default' },
  disputed: { label: 'Dipersengketakan', variant: 'destructive' },
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

function getPaymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] || method;
}

export function SettlementsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [detailTarget, setDetailTarget] = useState<Settlement | null>(null);

  const { data: settlements, isLoading } = useQuery({
    queryKey: ['settlements', statusFilter, startDate, endDate],
    queryFn: () =>
      settlementsApi.list({
        status: statusFilter !== 'all' ? (statusFilter as Settlement['status']) : undefined,
        dateFrom: startDate || undefined,
        dateTo: endDate || undefined,
      }),
  });

  const settleMutation = useMutation({
    mutationFn: (id: string) => settlementsApi.settle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      toast({ title: 'Penyelesaian berhasil dikonfirmasi' });
      setDetailTarget(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal menyelesaikan',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const totalSettled = settlements
    ?.filter((s) => s.status === 'settled')
    .reduce((sum, s) => sum + s.settledAmount, 0) ?? 0;

  const totalPending = settlements
    ?.filter((s) => s.status === 'pending')
    .reduce((sum, s) => sum + s.totalSales, 0) ?? 0;

  const totalDisputed = settlements
    ?.filter((s) => s.status === 'disputed')
    .reduce((sum, s) => sum + s.totalSales, 0) ?? 0;

  const columns: Column<Settlement>[] = [
    {
      key: 'date',
      header: 'Tanggal',
      cell: (row) => <span className="font-medium">{formatDate(row.date)}</span>,
    },
    {
      key: 'outletName',
      header: 'Outlet',
      cell: (row) => row.outletName,
    },
    {
      key: 'totalSales',
      header: 'Total Penjualan',
      cell: (row) => <span className="font-medium">{formatCurrency(row.totalSales)}</span>,
    },
    {
      key: 'cashAmount',
      header: 'Tunai',
      cell: (row) => <span className="text-muted-foreground">{formatCurrency(row.cashAmount)}</span>,
    },
    {
      key: 'nonCashAmount',
      header: 'Non-Tunai',
      cell: (row) => <span className="text-muted-foreground">{formatCurrency(row.nonCashAmount)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const status = STATUS_MAP[row.status] ?? { label: row.status, variant: 'outline' as const };
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setDetailTarget(row)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Penyelesaian" description="Rekonsiliasi pembayaran dan setoran bank" />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard
          title="Total Diselesaikan"
          value={formatCurrency(totalSettled)}
          icon={CheckCircle2}
        />
        <MetricCard
          title="Menunggu Penyelesaian"
          value={formatCurrency(totalPending)}
          icon={Clock}
        />
        <MetricCard
          title="Dipersengketakan"
          value={formatCurrency(totalDisputed)}
          icon={XCircle}
        />
      </div>

      <DataTable
        columns={columns}
        data={settlements ?? []}
        isLoading={isLoading}
        emptyTitle="Belum ada penyelesaian"
        emptyDescription="Data penyelesaian akan muncul setelah ada transaksi."
        filters={
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Tertunda</SelectItem>
                <SelectItem value="settled">Selesai</SelectItem>
                <SelectItem value="disputed">Dipersengketakan</SelectItem>
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

      {/* Settlement Detail Dialog */}
      <Dialog open={!!detailTarget} onOpenChange={(open) => { if (!open) setDetailTarget(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Penyelesaian</DialogTitle>
            <DialogDescription>
              {detailTarget && `Tanggal: ${formatDate(detailTarget.date)} - ${detailTarget.outletName}`}
            </DialogDescription>
          </DialogHeader>

          {detailTarget && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Penjualan</p>
                  <p className="text-lg font-bold">{formatCurrency(detailTarget.totalSales)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Tunai</p>
                  <p className="text-lg font-bold">{formatCurrency(detailTarget.cashAmount)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Non-Tunai</p>
                  <p className="text-lg font-bold">{formatCurrency(detailTarget.nonCashAmount)}</p>
                </div>
              </div>

              {(detailTarget.paymentBreakdown ?? []).length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">Rincian Metode Pembayaran</p>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Metode</TableHead>
                          <TableHead>Jumlah Transaksi</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(detailTarget.paymentBreakdown ?? []).map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{getPaymentMethodLabel(item.method)}</TableCell>
                            <TableCell>{item.transactionCount}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(item.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge variant={STATUS_MAP[detailTarget.status]?.variant ?? 'outline'}>
                    {STATUS_MAP[detailTarget.status]?.label ?? detailTarget.status}
                  </Badge>
                </div>
                {detailTarget.settledAt && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Diselesaikan pada</p>
                    <p className="text-sm">{formatDateTime(detailTarget.settledAt)}</p>
                  </div>
                )}
              </div>

              {detailTarget.notes && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Catatan</p>
                  <p className="text-sm">{detailTarget.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailTarget(null)}>
              Tutup
            </Button>
            {detailTarget?.status === 'pending' && (
              <Button
                onClick={() => detailTarget && settleMutation.mutate(detailTarget.id)}
                disabled={settleMutation.isPending}
                aria-busy={settleMutation.isPending}
                aria-label={settleMutation.isPending ? 'Mengkonfirmasi penyelesaian...' : undefined}
              >
                {settleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Banknote className="mr-2 h-4 w-4" />
                Konfirmasi Penyelesaian
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
