import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { tablesApi, type BillPaymentMethod } from '@/api/endpoints/tables.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';

const PAYMENT_METHODS: { value: BillPaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Tunai' },
  { value: 'qris', label: 'QRIS' },
  { value: 'debit_card', label: 'Kartu Debit' },
  { value: 'credit_card', label: 'Kartu Kredit' },
  { value: 'gopay', label: 'GoPay' },
  { value: 'ovo', label: 'OVO' },
  { value: 'dana', label: 'DANA' },
  { value: 'shopeepay', label: 'ShopeePay' },
  { value: 'linkaja', label: 'LinkAja' },
  { value: 'bank_transfer', label: 'Transfer Bank' },
];

const MAX_SPLITS = 10;

function PaymentMethodSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: BillPaymentMethod;
  onChange: (v: BillPaymentMethod) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as BillPaymentMethod)}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PAYMENT_METHODS.map((m) => (
          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface BillFormProps {
  onDone: () => void;
  onCancel: () => void;
}

/** Equal split: sends splitType 'equal' with one entry (and payment method) per part. */
export function SplitBillForm({ onDone, onCancel }: BillFormProps) {
  const [transactionId, setTransactionId] = useState('');
  const [methods, setMethods] = useState<BillPaymentMethod[]>(['cash', 'cash']);

  const setCount = (raw: string) => {
    const n = Math.min(Math.max(Number(raw) || 2, 2), MAX_SPLITS);
    setMethods((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? 'cash'));
  };

  const mutation = useMutation({
    mutationFn: () =>
      tablesApi.splitBill({
        transactionId: transactionId.trim(),
        splitType: 'equal',
        splits: methods.map((paymentMethod) => ({ paymentMethod })),
      }),
    onSuccess: () => {
      toast.success({ title: 'Tagihan berhasil dipisah' });
      onDone();
    },
    onError: (error) => handleMutationError(error, 'Gagal memisah tagihan'),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="split-transaction-id">ID Transaksi</Label>
        <Input
          id="split-transaction-id"
          placeholder="Masukkan ID transaksi..."
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="split-count">Jumlah Bagian (sama rata)</Label>
        <Input
          id="split-count"
          type="number"
          min={2}
          max={MAX_SPLITS}
          value={methods.length}
          onChange={(e) => setCount(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        {methods.map((m, i) => (
          <div key={i} className="grid grid-cols-[auto_1fr] items-center gap-3">
            <Label htmlFor={`split-method-${i}`} className="text-sm text-muted-foreground">
              Bagian {i + 1}
            </Label>
            <PaymentMethodSelect
              id={`split-method-${i}`}
              value={m}
              onChange={(v) => setMethods((prev) => prev.map((x, j) => (j === i ? v : x)))}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={mutation.isPending}>
          Batal
        </Button>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !transactionId.trim()}
          aria-busy={mutation.isPending}
        >
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Pisah Tagihan
        </Button>
      </div>
    </div>
  );
}

/** Merges 2..20 bills of one outlet; the original payments move to the merged bill. */
export function MergeBillForm({ onDone, onCancel }: BillFormProps) {
  const [idsText, setIdsText] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<BillPaymentMethod>('cash');

  const ids = idsText.split(',').map((id) => id.trim()).filter(Boolean);

  const mutation = useMutation({
    mutationFn: () => tablesApi.mergeBill({ transactionIds: ids, paymentMethod }),
    onSuccess: (result) => {
      toast.success({ title: 'Tagihan berhasil digabung', description: `No. ${result.receiptNumber}` });
      onDone();
    },
    onError: (error) => handleMutationError(error, 'Gagal menggabung tagihan'),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="merge-transaction-ids">ID Transaksi</Label>
        <Input
          id="merge-transaction-ids"
          placeholder="contoh: txn-001, txn-002"
          value={idsText}
          onChange={(e) => setIdsText(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Pisahkan setiap ID transaksi dengan tanda koma.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="merge-payment-method">Metode Pembayaran</Label>
        <PaymentMethodSelect id="merge-payment-method" value={paymentMethod} onChange={setPaymentMethod} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={mutation.isPending}>
          Batal
        </Button>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || ids.length < 2 || ids.length > 20}
          aria-busy={mutation.isPending}
        >
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Gabung Tagihan
        </Button>
      </div>
    </div>
  );
}
