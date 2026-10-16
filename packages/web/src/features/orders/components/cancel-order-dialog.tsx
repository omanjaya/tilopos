import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { ordersApi } from '@/api/endpoints/orders.api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface CancelOrderDialogProps {
  order: { id: string; orderNumber: string } | null;
  onClose: () => void;
  onCancelled?: () => void;
}

/**
 * Cancels via PUT /orders/:id/cancel (records the reason and frees the table),
 * not via the generic status endpoint.
 */
export function CancelOrderDialog({ order, onClose, onCancelled }: CancelOrderDialogProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  const close = () => {
    setReason('');
    onClose();
  };

  const mutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => ordersApi.cancel(id, reason),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', vars.id] });
      toast.success({ title: 'Pesanan dibatalkan' });
      onCancelled?.();
      close();
    },
    onError: (error) => handleMutationError(error, 'Gagal membatalkan pesanan'),
  });

  return (
    <Dialog open={!!order} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Batalkan Pesanan</DialogTitle>
          <DialogDescription>
            Batalkan pesanan &quot;{order?.orderNumber}&quot;? Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cancel-order-reason">Alasan Pembatalan</Label>
          <Textarea
            id="cancel-order-reason"
            placeholder="Masukkan alasan pembatalan..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={mutation.isPending}>
            Kembali
          </Button>
          <Button
            variant="destructive"
            onClick={() => order && mutation.mutate({ id: order.id, reason: reason.trim() })}
            disabled={mutation.isPending || !reason.trim()}
            aria-busy={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Batalkan Pesanan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
