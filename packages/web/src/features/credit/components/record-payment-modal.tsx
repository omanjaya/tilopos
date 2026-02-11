import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { creditApi } from '@/api/endpoints/credit.api';
import type { CreditSale } from '@/api/endpoints/credit.api';
import { formatCurrency } from '@/lib/format';
import { toast } from '@/hooks/use-toast';

interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  creditSale: CreditSale | null;
}

export function RecordPaymentModal({
  open,
  onClose,
  creditSale,
}: RecordPaymentModalProps) {
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const outstanding = creditSale?.outstandingAmount ?? 0;

  const recordPayment = useMutation({
    mutationFn: () => {
      if (!creditSale) throw new Error('No credit sale selected');
      return creditApi.recordPayment(creditSale.id, {
        amount,
        paymentMethod,
        referenceNumber: referenceNumber || undefined,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Pembayaran Berhasil',
        description: `${formatCurrency(amount)} berhasil dicatat.`,
      });
      void queryClient.invalidateQueries({ queryKey: ['credit-sales'] });
      void queryClient.invalidateQueries({ queryKey: ['credit-outstanding'] });
      void queryClient.invalidateQueries({
        queryKey: ['credit-payments', creditSale?.id],
      });
      void queryClient.invalidateQueries({
        queryKey: ['credit-sale-detail', creditSale?.id],
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: 'Gagal Mencatat Pembayaran',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    setAmount(0);
    setPaymentMethod('cash');
    setReferenceNumber('');
    setNotes('');
    onClose();
  };

  const handlePayFull = () => {
    setAmount(outstanding);
  };

  if (!creditSale) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-green-600" />
            Catat Pembayaran
          </DialogTitle>
          <DialogDescription>
            Catat pembayaran piutang untuk{' '}
            <span className="font-medium text-foreground">
              {creditSale.customer?.name ?? 'Pelanggan'}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Outstanding Info */}
          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div>
              <p className="text-xs text-muted-foreground">Sisa Piutang</p>
              <p className="text-lg font-bold text-amber-700">
                {formatCurrency(outstanding)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">No. Bon</p>
              <p className="text-sm font-medium">
                {creditSale.transaction?.receiptNumber ?? '-'}
              </p>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Jumlah Bayar</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePayFull}
                className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50"
              >
                Bayar Lunas
              </Button>
            </div>
            <Input
              type="number"
              min={1}
              max={outstanding}
              value={amount || ''}
              onChange={(e) =>
                setAmount(Math.min(Number(e.target.value) || 0, outstanding))
              }
              placeholder="Masukkan jumlah"
              autoFocus
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label className="text-sm">Metode Pembayaran</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Tunai</SelectItem>
                <SelectItem value="qris">QRIS</SelectItem>
                <SelectItem value="bank_transfer">Transfer Bank</SelectItem>
                <SelectItem value="card">Kartu</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reference Number */}
          {paymentMethod !== 'cash' && (
            <div className="space-y-1.5">
              <Label className="text-sm">
                No. Referensi{' '}
                <span className="text-xs text-muted-foreground">(opsional)</span>
              </Label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="No. approval / transfer"
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm">
              Catatan{' '}
              <span className="text-xs text-muted-foreground">(opsional)</span>
            </Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan pembayaran"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Batal
          </Button>
          <Button
            onClick={() => recordPayment.mutate()}
            disabled={amount <= 0 || amount > outstanding || recordPayment.isPending}
            className="bg-green-600 hover:bg-green-500 text-white"
          >
            {recordPayment.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            {recordPayment.isPending
              ? 'Memproses...'
              : `Bayar ${formatCurrency(amount)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
