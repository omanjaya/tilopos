import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  User,
  Calendar,
  Banknote,
  Loader2,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { creditApi } from '@/api/endpoints/credit.api';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { RecordPaymentModal } from './record-payment-modal';

interface CreditSaleDetailProps {
  open: boolean;
  onClose: () => void;
  creditSaleId: string | null;
}

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  outstanding: {
    label: 'Belum Lunas',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  partially_paid: {
    label: 'Sebagian',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  settled: {
    label: 'Lunas',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  overdue: {
    label: 'Jatuh Tempo',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
};

const paymentMethodLabels: Record<string, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  bank_transfer: 'Transfer Bank',
  card: 'Kartu',
  debit_card: 'Debit',
  credit_card: 'Kredit',
};

export function CreditSaleDetail({
  open,
  onClose,
  creditSaleId,
}: CreditSaleDetailProps) {
  const [showPayment, setShowPayment] = useState(false);

  const { data: creditSale, isLoading: isLoadingSale } = useQuery({
    queryKey: ['credit-sale-detail', creditSaleId],
    queryFn: () => creditApi.getById(creditSaleId!),
    enabled: open && !!creditSaleId,
  });

  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['credit-payments', creditSaleId],
    queryFn: () => creditApi.getPayments(creditSaleId!),
    enabled: open && !!creditSaleId,
  });

  const isLoading = isLoadingSale || isLoadingPayments;

  if (!creditSaleId) return null;

  const paymentProgress =
    creditSale && creditSale.totalAmount > 0
      ? (creditSale.paidAmount / creditSale.totalAmount) * 100
      : 0;

  const defaultStatus = { label: 'Belum Lunas', className: 'bg-amber-100 text-amber-800 border-amber-200' };
  const status = (creditSale?.status ? statusConfig[creditSale.status] : undefined) ?? defaultStatus;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-600" />
              Detail Piutang
            </DialogTitle>
            <DialogDescription>
              {creditSale?.transaction?.receiptNumber ?? 'Memuat...'}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : creditSale ? (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                {/* Customer & Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {creditSale.customer?.name ?? '-'}
                    </span>
                  </div>
                  <Badge className={status.className}>
                    {status.label}
                  </Badge>
                </div>

                {/* Payment Progress */}
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Progres Pembayaran
                    </span>
                    <span className="font-medium">
                      {Math.round(paymentProgress)}%
                    </span>
                  </div>
                  <Progress value={paymentProgress} className="h-2" />
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-muted-foreground">Dibayar: </span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(creditSale.paidAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total: </span>
                      <span className="font-medium">
                        {formatCurrency(creditSale.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Outstanding */}
                {creditSale.outstandingAmount > 0 && (
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="text-sm font-medium text-amber-700">
                      Sisa Piutang
                    </span>
                    <span className="text-lg font-bold text-amber-700">
                      {formatCurrency(creditSale.outstandingAmount)}
                    </span>
                  </div>
                )}

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Tanggal</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDateTime(creditSale.createdAt)}
                    </p>
                  </div>
                  {creditSale.dueDate && (
                    <div>
                      <p className="text-muted-foreground text-xs">
                        Jatuh Tempo
                      </p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(creditSale.dueDate)}
                      </p>
                    </div>
                  )}
                  {creditSale.notes && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Catatan</p>
                      <p className="font-medium">{creditSale.notes}</p>
                    </div>
                  )}
                  {creditSale.creditNotes && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">
                        Catatan BON
                      </p>
                      <p className="font-medium">{creditSale.creditNotes}</p>
                    </div>
                  )}
                </div>

                {/* Payment History */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Receipt className="h-4 w-4" />
                    Riwayat Pembayaran
                  </h4>
                  {payments.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Belum ada pembayaran
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg border"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {formatCurrency(payment.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {paymentMethodLabels[payment.paymentMethod] ??
                                payment.paymentMethod}
                              {payment.referenceNumber &&
                                ` - ${payment.referenceNumber}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(payment.createdAt)}
                            </p>
                            {payment.notes && (
                              <p className="text-xs text-muted-foreground">
                                {payment.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pay Button */}
                {creditSale.status !== 'settled' && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-500 text-white"
                    onClick={() => setShowPayment(true)}
                  >
                    <Banknote className="h-4 w-4 mr-2" />
                    Bayar Piutang
                  </Button>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Data tidak ditemukan
            </div>
          )}
        </DialogContent>
      </Dialog>

      <RecordPaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        creditSale={creditSale ?? null}
      />
    </>
  );
}
