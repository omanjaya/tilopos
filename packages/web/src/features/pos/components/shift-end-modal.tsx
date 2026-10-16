import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LogOut,
  Clock,
  Banknote,
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
import { ErrorState } from '@/components/shared/error-state';
import { useAuthStore } from '@/stores/auth.store';
import { posApi } from '@/api/endpoints/pos.api';
import { printHtml, escapeHtml } from '../utils/print-html';
import { apiErrorMessage } from '../utils/api-error';
import { formatCurrency, formatDuration } from '@/lib/format';
import { paymentMethodLabel } from '@/lib/payment-method-labels';
import { toast } from '@/lib/toast-utils';
import { cn } from '@/lib/utils';

interface ShiftEndModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  shiftData: {
    id: string;
    startedAt: string;
    totalSales?: number;
  } | null;
}

// Quick amount presets based on common cash denominations
const QUICK_AMOUNTS = [10000, 20000, 50000, 100000, 200000];

interface CompletedShift {
  expectedCash: number;
  actualCash: number;
  difference: number;
  openingCash?: number;
}

export function ShiftEndModal({
  open,
  onClose,
  onSuccess,
  shiftData,
}: ShiftEndModalProps) {
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedShift, setCompletedShift] = useState<CompletedShift | null>(null);

  // Live shift totals from the server (GET /employees/shifts/:id/summary):
  // opening cash, cash sales/refunds, cash in/out and the expected cash.
  const shiftRecordQuery = useQuery({
    queryKey: ['pos', 'shift-summary', shiftData?.id],
    queryFn: () => posApi.getShiftSummary(shiftData!.id),
    enabled: open && !!shiftData?.id,
  });
  const record = shiftRecordQuery.data;

  // Calculate shift duration
  const duration = useMemo(() => {
    if (!shiftData?.startedAt) return 0;
    const start = new Date(shiftData.startedAt);
    const now = new Date();
    return (now.getTime() - start.getTime()) / (1000 * 60); // minutes
  }, [shiftData?.startedAt]);

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
    if (!shiftData) {
      toast.error({ title: 'Gagal', description: 'Data shift tidak valid' });
      return;
    }

    const cashAmount = parseInt(closingCash) || 0;

    setIsSubmitting(true);
    try {
      const result = await posApi.endShift(shiftData.id, {
        closingCash: cashAmount,
        notes: notes || undefined,
      });

      setCompletedShift({
        expectedCash: Number(result.expectedCash),
        actualCash: Number(result.actualCash),
        difference: Number(result.difference),
        openingCash: record?.openingCash,
      });

      toast.success({
        title: 'Shift Berhasil Ditutup',
        description: formatDuration(duration),
      });
    } catch (error) {
      toast.error({
        title: 'Gagal Menutup Shift',
        description: apiErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close from summary
  const handleSummaryClose = () => {
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
      setCompletedShift(null);
      onClose();
    }
  };

  if (!shiftData) return null;

  if (completedShift) {
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
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Durasi</p>
              <p className="font-semibold text-sm">{formatDuration(duration)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Banknote className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Kas Awal</p>
              <p className="font-semibold text-sm">
                {record ? formatCurrency(record.openingCash) : '-'}
              </p>
            </div>
          </div>

          {shiftRecordQuery.isError && (
            <ErrorState
              title="Gagal memuat data shift"
              error={shiftRecordQuery.error}
              onRetry={() => void shiftRecordQuery.refetch()}
            />
          )}

          <Separator />

          {/* Cash movements recorded on the shift */}
          <div className="space-y-2">
            <Label className="text-sm">Perhitungan Kas</Label>
            <div className="space-y-1.5 p-3 bg-muted/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kas Awal</span>
                <span>{record ? formatCurrency(record.openingCash) : '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Penjualan Tunai</span>
                <span className="text-green-600">+{record ? formatCurrency(record.cashSales) : '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Refund Tunai</span>
                <span className="text-red-600">-{record ? formatCurrency(record.cashRefunds) : '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kas Masuk</span>
                <span className="text-green-600">+{record ? formatCurrency(record.cashIn) : '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kas Keluar</span>
                <span className="text-red-600">-{record ? formatCurrency(record.cashOut) : '-'}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between text-sm font-semibold">
                <span>Kas Diharapkan</span>
                <span>{record ? formatCurrency(record.expectedCash) : '-'}</span>
              </div>
            </div>
          </div>

          {record && record.paymentBreakdown.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">
                Penjualan per Metode ({record.transactionCount} transaksi)
              </Label>
              <div className="space-y-1.5 p-3 bg-muted/50 rounded-lg">
                {record.paymentBreakdown.map((p) => (
                  <div key={p.method} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {paymentMethodLabel(p.method)} ({p.count})
                    </span>
                    <span>{formatCurrency(p.amount)}</span>
                  </div>
                ))}
                <Separator className="my-1" />
                <div className="flex justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(record.paymentTotal)}</span>
                </div>
              </div>
            </div>
          )}

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
                  aria-label={key === 'BS' ? 'Hapus digit' : key === 'C' ? 'Kosongkan' : undefined}
                >
                  {key === 'BS' ? '⌫' : key}
                </Button>
              )
            )}
          </div>

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

// Shift Summary Modal (shown after successful shift close) — values come from
// the POST /employees/shifts/:id/end response.
interface ShiftSummaryModalProps {
  open: boolean;
  onClose: () => void;
  shiftData: {
    id: string;
    startedAt: string;
    totalSales?: number;
  };
  completedShift: CompletedShift;
}

function ShiftSummaryModal({
  open,
  onClose,
  shiftData,
  completedShift,
}: ShiftSummaryModalProps) {
  const user = useAuthStore((s) => s.user);
  const duration =
    (new Date().getTime() - new Date(shiftData.startedAt).getTime()) / (1000 * 60);

  const handlePrint = () => {
    const row = (label: string, value: string) =>
      `<tr><td>${escapeHtml(label)}</td><td class="right">${escapeHtml(value)}</td></tr>`;
    const diff = `${completedShift.difference >= 0 ? '+' : ''}${formatCurrency(completedShift.difference)}`;
    const html = `
      <div class="center bold">LAPORAN TUTUP SHIFT</div>
      <div class="center">${escapeHtml(user?.outletName ?? '')}</div>
      <hr/>
      <table>
        ${row('Kasir', user?.name ?? '-')}
        ${row('Mulai', new Date(shiftData.startedAt).toLocaleString('id-ID'))}
        ${row('Selesai', new Date().toLocaleString('id-ID'))}
        ${row('Durasi', formatDuration(duration))}
      </table>
      <hr/>
      <table>
        ${completedShift.openingCash !== undefined ? row('Kas Awal', formatCurrency(completedShift.openingCash)) : ''}
        ${row('Kas Diharapkan', formatCurrency(completedShift.expectedCash))}
        ${row('Kas Aktual', formatCurrency(completedShift.actualCash))}
        ${row('Selisih', diff)}
      </table>
      <hr/>
      <div class="center">Dicetak ${escapeHtml(new Date().toLocaleString('id-ID'))}</div>`;
    try {
      printHtml(html, 'Laporan Shift');
    } catch (error) {
      toast.error({ title: 'Gagal Mencetak', description: apiErrorMessage(error) });
    }
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
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Durasi</p>
            <p className="font-bold">{formatDuration(duration)}</p>
          </div>

          <Separator />

          {/* Cash Summary */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Ringkasan Kas</p>
            <div className="space-y-1.5 p-3 bg-muted/50 rounded-lg">
              {completedShift.openingCash !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kas Awal</span>
                  <span>{formatCurrency(completedShift.openingCash)}</span>
                </div>
              )}
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
