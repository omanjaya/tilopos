import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Printer, Loader2 } from 'lucide-react';
import { transactionsApi } from '@/api/endpoints/transactions.api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import type { Transaction, TransactionPayment } from '@/types/transaction.types';

interface InvoiceDetailModalProps {
  invoiceId: string | null;
  open: boolean;
  onClose: () => void;
}

const PAYMENT_LABELS: Record<string, string> = {
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

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
  completed: { label: 'Selesai', variant: 'default' },
  voided: { label: 'Void', variant: 'destructive' },
  refunded: { label: 'Refund', variant: 'outline' },
  held: { label: 'Ditahan', variant: 'secondary' },
  partial_refund: { label: 'Refund Sebagian', variant: 'secondary' },
};

export function InvoiceDetailModal({ invoiceId, open, onClose }: InvoiceDetailModalProps) {
  const { data: transaction, isLoading } = useQuery({
    queryKey: ['transaction', invoiceId],
    queryFn: () => transactionsApi.get(invoiceId!),
    enabled: !!invoiceId && open,
  });

  const handlePrint = () => {
    window.print();
  };

  const status = transaction?.status ? STATUS_MAP[transaction.status] : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Invoice</DialogTitle>
              <DialogDescription className="sr-only">Detail invoice transaksi</DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Cetak
              </Button>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : transaction ? (
          <InvoiceContent transaction={transaction} status={status ?? null} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function InvoiceContent({
  transaction,
  status,
}: {
  transaction: Transaction;
  status: { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' } | null;
}) {
  return (
    <div id="invoice-print-area" className="p-6 pt-4 print:p-0">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">Invoice</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(transaction.createdAt), 'dd MMMM yyyy, HH:mm', { locale: idLocale })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">No. Invoice</p>
          <p className="font-semibold">{transaction.transactionNumber}</p>
          {status && (
            <Badge variant={status.variant} className="mt-1">
              {status.label}
            </Badge>
          )}
        </div>
      </div>

      <Separator className="my-4" />

      {/* Customer & Cashier Info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Pelanggan</p>
          <p className="font-medium">{transaction.customerName || 'Umum'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Kasir</p>
          <p className="font-medium">{transaction.employeeName}</p>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Items Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="py-2 text-left font-medium">Item</th>
            <th className="py-2 text-center font-medium w-16">Qty</th>
            <th className="py-2 text-right font-medium">Harga</th>
            <th className="py-2 text-right font-medium">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {transaction.items?.map((item) => (
            <tr key={item.id} className="border-b last:border-0">
              <td className="py-2">
                <p className="font-medium">{item.productName}</p>
                {item.variantName && (
                  <p className="text-xs text-muted-foreground">{item.variantName}</p>
                )}
                {item.notes && (
                  <p className="text-xs text-muted-foreground italic">{item.notes}</p>
                )}
              </td>
              <td className="py-2 text-center">{item.quantity}</td>
              <td className="py-2 text-right">{formatCurrency(item.unitPrice)}</td>
              <td className="py-2 text-right">{formatCurrency(item.totalPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Separator className="my-4" />

      {/* Totals */}
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(transaction.subtotal)}</span>
        </div>
        {transaction.discountAmount > 0 && (
          <div className="flex justify-between text-red-500">
            <span>Diskon</span>
            <span>-{formatCurrency(transaction.discountAmount)}</span>
          </div>
        )}
        {transaction.taxAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pajak</span>
            <span>{formatCurrency(transaction.taxAmount)}</span>
          </div>
        )}
        {transaction.serviceCharge > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service Charge</span>
            <span>{formatCurrency(transaction.serviceCharge)}</span>
          </div>
        )}
        <Separator className="my-2" />
        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span>{formatCurrency(transaction.totalAmount)}</span>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Payment Info */}
      <div className="space-y-1 text-sm">
        <p className="font-medium mb-2">Pembayaran</p>
        {transaction.payments?.map((payment: TransactionPayment) => (
          <div key={payment.id} className="flex justify-between">
            <span className="text-muted-foreground">{PAYMENT_LABELS[payment.method] || payment.method}</span>
            <span>{formatCurrency(payment.amount)}</span>
          </div>
        ))}
        {transaction.changeAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Kembalian</span>
            <span>{formatCurrency(transaction.changeAmount)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
