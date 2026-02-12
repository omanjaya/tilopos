import { useState, useMemo } from 'react';
import {
  LogOut,
  Clock,
  Receipt,
  Banknote,
  Wallet,
  QrCode,
  CreditCard,
  Check,
  Loader2,
  Printer,
} from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth.store';
import { shiftsApi } from '@/api/endpoints/shifts.api';
import { formatCurrency, formatDuration } from '@/lib/format';
import { toast } from '@/lib/toast-utils';
import { cn } from '@/lib/utils';

interface ShiftEndModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  shiftData: {
    id: string;
    startedAt: string;
    openingCash: number;
    totalSales: number;
    transactions: number;
    paymentBreakdown?: PaymentBreakdownItem[];
  } | null;
}

interface PaymentBreakdownItem {
  method: string;
  amount: number;
  count: number;
}

// Quick amount presets based on common cash denominations
const QUICK_AMOUNTS = [10000, 20000, 50000, 100000, 200000];

// Payment method icons
const paymentMethodIcons: Record<string, React.ElementType> = {
  cash: Banknote,
  qris: QrCode,
  debit_card: CreditCard,
  credit_card: CreditCard,
  gopay: Wallet,
  ovo: Wallet,
  dana: Wallet,
  shopeepay: Wallet,
  linkaja: Wallet,
};

// Payment method names
const paymentMethodNames: Record<string, string> = {
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

export function ShiftEndModal({
  open,
  onClose,
  onSuccess,
  shiftData,
}: ShiftEndModalProps) {
  const user = useAuthStore((s) => s.user);

  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [completedShift, setCompletedShift] = useState<{
    expectedCash: number;
    actualCash: number;
    difference: number;
  } | null>(null);

  // Calculate shift duration
  const duration = useMemo(() => {
    if (!shiftData?.startedAt) return 0;
    const start = new Date(shiftData.startedAt);
    const now = new Date();
    return (now.getTime() - start.getTime()) / (1000 * 60); // minutes
  }, [shiftData?.startedAt]);

  // Get cash sales from payment breakdown
  const cashSales = useMemo(() => {
    if (!shiftData?.paymentBreakdown) return 0;
    const cashItem = shiftData.paymentBreakdown.find((p) => p.method === 'cash');
    return cashItem?.amount || 0;
  }, [shiftData?.paymentBreakdown]);

  // Calculate expected cash and difference
  const expectedCash = (shiftData?.openingCash || 0) + cashSales;
  const actualCash = parseInt(closingCash) || 0;
  const difference = actualCash - expectedCash;

  // Check if difference is within tolerance (+/- 1000)
  const isWithinTolerance = Math.abs(difference) <= 1000;

  // Format display value for input
  const displayClosingCash = closingCash
    ? parseInt(closingCash).toLocaleString('id-ID')
    : '0';

  // Handle numpad input
  const handleNumpadClick = (key: string) => {
    if (key === 'C') {
      setClosingCash('');
    } else if (key === 'BS') {
      setClosingCash((prev) => prev.slice(0, -1));
    } else if (key === '00') {
      setClosingCash((prev) => prev + '00');
    } else {
      setClosingCash((prev) => prev + key);
    }
  };

  // Handle quick amount
  const handleQuickAmount = (amount: number) => {
    setClosingCash(amount.toString());
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!shiftData || !user?.employeeId) {
      toast.error({
        title: 'Gagal',
        description: 'Data shift atau karyawan tidak valid',
      });
      return;
    }

    const cashAmount = parseInt(closingCash) || 0;

    setIsSubmitting(true);
    try {
      await shiftsApi.end(user.employeeId, {
        closingCash: cashAmount,
        notes: notes || undefined,
      });

      setCompletedShift({
        expectedCash,
        actualCash: cashAmount,
        difference,
      });

      setShowSummary(true);

      toast.success({
        title: 'Shift Berhasil Ditutup',
        description: `${formatDuration(duration)} • ${shiftData.transactions} transaksi`,
      });
    } catch (error) {
      toast.error({
        title: 'Gagal Menutup Shift',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close from summary
  const handleSummaryClose = () => {
    setShowSummary(false);
    setClosingCash('');
    setNotes('');
    setCompletedShift(null);
    onSuccess();
    onClose();
  };

  // Reset state on modal close
  const handleModalClose = () => {
    if (!isSubmitting) {
      setClosingCash('');
      setNotes('');
      setShowSummary(false);
      setCompletedShift(null);
      onClose();
    }
  };

  if (!shiftData) return null;

  if (showSummary && completedShift) {
    return <ShiftSummaryModal open={open} onClose={handleSummaryClose} shiftData={shiftData} completedShift={completedShift} />;
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleModalClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-0">
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-primary" />
            Tutup Shift
          </DialogTitle>
          <DialogDescription>
            Konfirmasi kas akhir dan tutup shift kasir
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4 space-y-4">
          {/* Shift Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Durasi</p>
              <p className="font-semibold text-sm">{formatDuration(duration)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Receipt className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Transaksi</p>
              <p className="font-semibold text-sm">{shiftData.transactions}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Banknote className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total Penjualan</p>
              <p className="font-semibold text-sm">{formatCurrency(shiftData.totalSales)}</p>
            </div>
          </div>

          {/* Payment Method Breakdown */}
          {shiftData.paymentBreakdown && shiftData.paymentBreakdown.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Pembayaran per Metode</Label>
              <div className="space-y-1.5">
                {shiftData.paymentBreakdown.map((payment) => {
                  const Icon = paymentMethodIcons[payment.method] || Wallet;
                  return (
                    <div
                      key={payment.method}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {paymentMethodNames[payment.method] || payment.method}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {payment.count}
                        </Badge>
                      </div>
                      <span className="font-medium text-sm">
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          {/* Cash Calculation */}
          <div className="space-y-2">
            <Label className="text-sm">Perhitungan Kas</Label>
            <div className="space-y-1.5 p-3 bg-muted/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kas Awal</span>
                <span>{formatCurrency(shiftData.openingCash)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Penjualan Tunai</span>
                <span className="text-green-600">+{formatCurrency(cashSales)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between font-semibold">
                <span>Kas Diharapkan</span>
                <span>{formatCurrency(expectedCash)}</span>
              </div>
            </div>
          </div>

          {/* Closing Cash Input */}
          <div className="space-y-2">
            <Label htmlFor="closingCash" className="text-sm">
              Kas Akhir (Rp)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                Rp
              </span>
              <Input
                id="closingCash"
                type="text"
                inputMode="numeric"
                value={displayClosingCash}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setClosingCash(val);
                }}
                className="text-right text-2xl font-bold pl-10 h-14"
                placeholder="0"
                readOnly
              />
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {QUICK_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(amount)}
                className="font-medium"
              >
                {formatCurrency(amount)}
              </Button>
            ))}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'BS'].map(
              (key) => (
                <Button
                  key={key}
                  variant="outline"
                  className={cn(
                    'h-12 text-lg font-semibold',
                    key === 'C' && 'text-red-500',
                    key === 'BS' && 'text-yellow-600'
                  )}
                  onClick={() => handleNumpadClick(key)}
                >
                  {key === 'BS' ? '⌫' : key}
                </Button>
              )
            )}
          </div>

          {/* Difference Display */}
          {closingCash && (
            <div
              className={cn(
                'p-3 rounded-lg flex items-center justify-between',
                isWithinTolerance
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              )}
            >
              <span className="text-sm font-medium">Selisih</span>
              <span
                className={cn(
                  'text-lg font-bold',
                  isWithinTolerance ? 'text-green-700' : 'text-red-700'
                )}
              >
                {difference >= 0 ? '+' : ''}
                {formatCurrency(difference)}
              </span>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm">
              Catatan <span className="text-muted-foreground">(opsional)</span>
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan selisih, kejadian penting, dll..."
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-4">
          <Button variant="outline" onClick={handleModalClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!closingCash || isSubmitting}
            className="bg-gradient-to-r from-primary to-primary/80"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Tutup Shift
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Shift Summary Modal (shown after successful shift close)
interface ShiftSummaryModalProps {
  open: boolean;
  onClose: () => void;
  shiftData: {
    id: string;
    startedAt: string;
    openingCash: number;
    totalSales: number;
    transactions: number;
  };
  completedShift: {
    expectedCash: number;
    actualCash: number;
    difference: number;
  };
}

function ShiftSummaryModal({
  open,
  onClose,
  shiftData,
  completedShift,
}: ShiftSummaryModalProps) {
  const duration =
    (new Date().getTime() - new Date(shiftData.startedAt).getTime()) / (1000 * 60);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            Shift Berhasil Ditutup
          </DialogTitle>
          <DialogDescription>
            Ringkasan shift kasir telah selesai
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Durasi</p>
              <p className="font-bold">{formatDuration(duration)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Transaksi</p>
              <p className="font-bold">{shiftData.transactions}</p>
            </div>
          </div>

          <Separator />

          {/* Cash Summary */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Ringkasan Kas</p>
            <div className="space-y-1.5 p-3 bg-muted/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kas Awal</span>
                <span>{formatCurrency(shiftData.openingCash)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Diharapkan</span>
                <span>{formatCurrency(completedShift.expectedCash)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Aktual</span>
                <span>{formatCurrency(completedShift.actualCash)}</span>
              </div>
              <Separator className="my-1" />
              <div
                className={cn(
                  'flex justify-between font-semibold',
                  Math.abs(completedShift.difference) <= 1000
                    ? 'text-green-700'
                    : 'text-red-700'
                )}
              >
                <span>Selisih</span>
                <span>
                  {completedShift.difference >= 0 ? '+' : ''}
                  {formatCurrency(completedShift.difference)}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Total Sales */}
          <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
            <span className="text-sm">Total Penjualan</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(shiftData.totalSales)}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Cetak
          </Button>
          <Button onClick={onClose} className="gap-2">
            <Check className="h-4 w-4" />
            Selesai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
