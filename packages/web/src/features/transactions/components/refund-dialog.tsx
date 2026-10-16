import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
import {
  transactionsApi,
  type RefundMethod,
  type RefundReason,
} from '@/api/endpoints/transactions.api';
import type { Transaction } from '@/types/transaction.types';

const REFUND_METHOD_LABELS: Record<RefundMethod, string> = {
  cash: 'Tunai',
  original_method: 'Metode pembayaran asal',
};

const REFUND_REASON_LABELS: Record<RefundReason, string> = {
  customer_request: 'Permintaan pelanggan',
  wrong_order: 'Pesanan salah',
  defect: 'Produk rusak/cacat',
  other: 'Lainnya',
};

interface RefundDialogProps {
  transaction: Transaction | null;
  onClose: () => void;
}

/** Full refund of every item, matching backend ProcessRefundDto. */
export function RefundDialog({ transaction, onClose }: RefundDialogProps) {
  const queryClient = useQueryClient();
  const [refundMethod, setRefundMethod] = useState<RefundMethod>('original_method');
  const [reason, setReason] = useState<RefundReason>('customer_request');
  const [notes, setNotes] = useState('');

  const reset = () => {
    setRefundMethod('original_method');
    setReason('customer_request');
    setNotes('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const mutation = useMutation({
    mutationFn: (tx: Transaction) =>
      transactionsApi.refund({
        transactionId: tx.id,
        items: tx.items.map((item) => ({
          transactionItemId: item.id,
          quantity: item.quantity,
          reason,
        })),
        refundMethod,
        notes: notes.trim() || undefined,
      }),
    onSuccess: (_data, tx) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction', tx.id] });
      toast.success({ title: 'Refund berhasil diproses' });
      close();
    },
    onError: (error) => handleMutationError(error, 'Gagal memproses refund'),
  });

  const hasItems = (transaction?.items.length ?? 0) > 0;

  return (
    <Dialog open={!!transaction} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refund Transaksi</DialogTitle>
          <DialogDescription>
            Refund seluruh item dari transaksi &quot;{transaction?.transactionNumber}&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="refund-method">Metode Refund</Label>
            <Select value={refundMethod} onValueChange={(v) => setRefundMethod(v as RefundMethod)}>
              <SelectTrigger id="refund-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(REFUND_METHOD_LABELS) as RefundMethod[]).map((m) => (
                  <SelectItem key={m} value={m}>{REFUND_METHOD_LABELS[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="refund-reason">Alasan Refund</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as RefundReason)}>
              <SelectTrigger id="refund-reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(REFUND_REASON_LABELS) as RefundReason[]).map((r) => (
                  <SelectItem key={r} value={r}>{REFUND_REASON_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="refund-notes">Catatan (opsional)</Label>
            <Textarea
              id="refund-notes"
              placeholder="Tambahkan catatan refund..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {!hasItems && (
            <p className="text-sm text-destructive">Transaksi ini tidak memiliki item untuk direfund.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={mutation.isPending}>
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={() => transaction && mutation.mutate(transaction)}
            disabled={mutation.isPending || !hasItems}
            aria-busy={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mutation.isPending ? 'Memproses refund...' : 'Proses Refund'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
