import { useState } from 'react';
import { Loader2, MinusCircle, PlusCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { posApi } from '@/api/endpoints/pos.api';
import { formatCurrency } from '@/lib/format';
import { toast } from '@/lib/toast-utils';
import { apiErrorMessage } from '../utils/api-error';

interface CashDrawerModalProps {
    open: boolean;
    type: 'cash_in' | 'cash_out';
    shiftId: string | null;
    onClose: () => void;
    onSuccess?: () => void;
}

/** Record petty cash in/out on the open shift (POST /pos/cash-in, /pos/cash-out). */
export function CashDrawerModal({ open, type, shiftId, onClose, onSuccess }: CashDrawerModalProps) {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isCashIn = type === 'cash_in';
    const numericAmount = parseInt(amount) || 0;
    const canSubmit =
        !!shiftId && numericAmount > 0 && (isCashIn || reason.trim().length > 0) && !isSubmitting;

    const reset = () => {
        setAmount('');
        setReason('');
        setNotes('');
    };

    const handleClose = () => {
        if (isSubmitting) return;
        reset();
        onClose();
    };

    const handleSubmit = async () => {
        if (!shiftId || !canSubmit) return;
        setIsSubmitting(true);
        try {
            if (isCashIn) {
                await posApi.cashIn(shiftId, { amount: numericAmount, notes: notes || undefined });
            } else {
                await posApi.cashOut(shiftId, {
                    amount: numericAmount,
                    reason: reason.trim(),
                    notes: notes || undefined,
                });
            }
            toast.success({
                title: isCashIn ? 'Kas Masuk Dicatat' : 'Kas Keluar Dicatat',
                description: formatCurrency(numericAmount),
            });
            reset();
            onSuccess?.();
            onClose();
        } catch (error) {
            toast.error({
                title: isCashIn ? 'Gagal Mencatat Kas Masuk' : 'Gagal Mencatat Kas Keluar',
                description: apiErrorMessage(error),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isCashIn ? (
                            <PlusCircle className="h-5 w-5 text-green-600" />
                        ) : (
                            <MinusCircle className="h-5 w-5 text-red-600" />
                        )}
                        {isCashIn ? 'Kas Masuk' : 'Kas Keluar'}
                    </DialogTitle>
                    <DialogDescription>
                        {isCashIn
                            ? 'Catat uang yang dimasukkan ke laci kas selama shift.'
                            : 'Catat uang yang diambil dari laci kas selama shift.'}
                    </DialogDescription>
                </DialogHeader>

                {!shiftId ? (
                    <p className="text-sm text-muted-foreground">Mulai shift terlebih dahulu.</p>
                ) : (
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="cash-drawer-amount">Jumlah (Rp)</Label>
                            <Input
                                id="cash-drawer-amount"
                                inputMode="numeric"
                                value={amount ? parseInt(amount).toLocaleString('id-ID') : ''}
                                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                                placeholder="0"
                                autoFocus
                            />
                        </div>
                        {!isCashIn && (
                            <div className="space-y-1.5">
                                <Label htmlFor="cash-drawer-reason">Alasan</Label>
                                <Input
                                    id="cash-drawer-reason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Contoh: beli es batu"
                                    maxLength={200}
                                />
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label htmlFor="cash-drawer-notes">Catatan (opsional)</Label>
                            <Input
                                id="cash-drawer-notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                maxLength={500}
                            />
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Batal
                    </Button>
                    <Button onClick={() => void handleSubmit()} disabled={!canSubmit}>
                        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
