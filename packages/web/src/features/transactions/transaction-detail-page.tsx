import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '@/api/endpoints/transactions.api';
import { PageHeader } from '@/components/shared/page-header';
import { MetricCard } from '@/components/shared/metric-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { formatCurrency, formatDateTime } from '@/lib/format';
import { paymentMethodLabel } from '@/lib/payment-method-labels';
import {
  ArrowLeft,
  XCircle,
  RotateCcw,
  Printer,
  Loader2,
  Receipt,
  Percent,
  BadgeDollarSign,
  Wallet,
  User,
  Calendar,
  UserCheck,
} from 'lucide-react';
import type { TransactionStatus } from '@/types/transaction.types';
import { useAuthStore } from '@/stores/auth.store';
import { hasRole } from '@/config/permissions';
import { ErrorState } from '@/components/shared/error-state';
import { isAxiosError } from 'axios';
import { RefundDialog } from './components/refund-dialog';
import { useReprint } from './components/use-reprint';

const STATUS_MAP: Record<TransactionStatus, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
  completed: { label: 'Selesai', variant: 'default' },
  voided: { label: 'Void', variant: 'destructive' },
  refunded: { label: 'Refund', variant: 'outline' },
  partially_refunded: { label: 'Refund Sebagian', variant: 'secondary' },
  pending: { label: 'Menunggu Pembayaran', variant: 'secondary' },
  credit: { label: 'BON', variant: 'secondary' },
  partially_paid: { label: 'Dibayar Sebagian', variant: 'secondary' },
  split: { label: 'Dipisah', variant: 'outline' },
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu konfirmasi',
  failed: 'Gagal',
  refunded: 'Dikembalikan',
};

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const role = useAuthStore((s) => s.user?.role);
  // Backend POST /pos/void and /pos/refunds: @Roles(SUPERVISOR, MANAGER, OWNER)
  const canVoidOrRefund = hasRole(role, 'SUPERVISION');
  const { reprint, loadingId: reprintLoadingId, dialog: reprintDialog } = useReprint();

  const { data: transaction, isLoading, error, refetch } = useQuery({
    queryKey: ['transaction', id],
    queryFn: () => transactionsApi.get(id!),
    enabled: !!id,
  });

  const voidMutation = useMutation({
    mutationFn: ({ transactionId, reason }: { transactionId: string; reason: string }) =>
      transactionsApi.void(transactionId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction', id] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success({ title: 'Transaksi berhasil di-void' });
      setVoidDialogOpen(false);
      setVoidReason('');
    },
    onError: (error) => handleMutationError(error, 'Gagal void transaksi'),
  });

  const handleReprint = () => {
    if (id) void reprint(id);
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="">
          <Button variant="outline" onClick={() => navigate('/app/transactions')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
        </PageHeader>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const isNotFound = isAxiosError(error) && error.response?.status === 404;
  if (error && !isNotFound) {
    return (
      <div>
        <PageHeader title="Detail Transaksi">
          <Button variant="outline" onClick={() => navigate('/app/transactions')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
        </PageHeader>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div>
        <PageHeader title="Transaksi Tidak Ditemukan" description="Transaksi yang Anda cari tidak ditemukan.">
          <Button variant="outline" onClick={() => navigate('/app/transactions')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
        </PageHeader>
      </div>
    );
  }

  const status = STATUS_MAP[transaction.status] ?? { label: transaction.status, variant: 'secondary' as const };
  const isCompleted = transaction.status === 'completed';

  return (
    <div>
      <PageHeader
        title={transaction.transactionNumber}
        description="Detail transaksi"
      >
        <Button variant="outline" onClick={() => navigate('/app/transactions')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
        <Button variant="outline" onClick={handleReprint} disabled={!!reprintLoadingId}>
          <Printer className="mr-2 h-4 w-4" /> Cetak Ulang
        </Button>
        {canVoidOrRefund && isCompleted && (
          <Button variant="outline" onClick={() => setVoidDialogOpen(true)}>
            <XCircle className="mr-2 h-4 w-4" /> Void
          </Button>
        )}
        {canVoidOrRefund && isCompleted && (
          <Button variant="outline" onClick={() => setRefundDialogOpen(true)}>
            <RotateCcw className="mr-2 h-4 w-4" /> Refund
          </Button>
        )}
      </PageHeader>

      <div className="space-y-6">
        {/* Summary Card */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-6 p-6">
            <div className="flex items-center gap-2">
              <Badge variant={status.variant} className="text-sm">
                {status.label}
              </Badge>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {formatDateTime(transaction.createdAt)}
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserCheck className="h-4 w-4" />
              Kasir: {transaction.employeeName}
            </div>
            {transaction.customerName && (
              <>
                <Separator orientation="vertical" className="h-8" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  Pelanggan: {transaction.customerName}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <MetricCard
            title="Subtotal"
            value={formatCurrency(transaction.subtotal)}
            icon={Receipt}
          />
          <MetricCard
            title="Diskon"
            value={formatCurrency(transaction.discountAmount)}
            icon={Percent}
          />
          <MetricCard
            title="Pajak"
            value={formatCurrency(transaction.taxAmount)}
            icon={BadgeDollarSign}
          />
          <MetricCard
            title="Total"
            value={formatCurrency(transaction.totalAmount)}
            icon={Wallet}
            description={
              transaction.roundingAmount
                ? `Termasuk pembulatan ${formatCurrency(transaction.roundingAmount)}`
                : undefined
            }
          />
        </div>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Item Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Produk</TableHead>
                    <TableHead>Varian</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Harga Satuan</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Modifier</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transaction.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                        Tidak ada item
                      </TableCell>
                    </TableRow>
                  ) : (
                    transaction.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.variantName || '-'}
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.totalPrice)}
                        </TableCell>
                        <TableCell>
                          {item.modifiers.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {item.modifiers.map((mod, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {mod}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metode</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>Referensi</TableHead>
                    <TableHead>Waktu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transaction.payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                        Tidak ada pembayaran
                      </TableCell>
                    </TableRow>
                  ) : (
                    transaction.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {paymentMethodLabel(payment.method)}
                          {payment.status !== 'completed' && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.reference || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(payment.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Payment Summary */}
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Dibayar</span>
                  <span className="font-medium">{formatCurrency(transaction.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kembalian</span>
                  <span className="font-medium">{formatCurrency(transaction.changeAmount)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Void Dialog */}
      <Dialog open={voidDialogOpen} onOpenChange={(open) => { if (!open) { setVoidDialogOpen(false); setVoidReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Transaksi</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin void transaksi "{transaction.transactionNumber}"? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="detail-void-reason">Alasan Void</Label>
            <Textarea
              id="detail-void-reason"
              placeholder="Masukkan alasan void..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setVoidDialogOpen(false); setVoidReason(''); }}
              disabled={voidMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => voidMutation.mutate({ transactionId: transaction.id, reason: voidReason })}
              disabled={voidMutation.isPending || !voidReason.trim()}
            >
              {voidMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {voidMutation.isPending ? 'Memproses void...' : 'Void Transaksi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RefundDialog
        transaction={refundDialogOpen ? transaction : null}
        onClose={() => setRefundDialogOpen(false)}
      />

      {reprintDialog}
    </div>
  );
}
