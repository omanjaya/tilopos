import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    CreditCard,
    Banknote,
    Wallet,
    QrCode,
    X,
    Check,
    Plus,
    Loader2,
    ChevronLeft,
    FileText,
    Landmark,
    RefreshCw,
} from 'lucide-react';
import { posApi } from '@/api/endpoints/pos.api';
import {
    CASH_ONLY,
    toPaymentOptions,
    type PaymentOption,
    type PaymentOptionKind,
} from '../utils/payment-options';
import { PAYMENT_METHOD_LABELS } from '../utils/receipt-html';
import { useBusinessFeatures } from '@/hooks/use-business-features';
import { CreditCheckoutModal, type CreditCheckoutData } from './credit-checkout-modal';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useCartStore } from '@/stores/cart.store';
import { useCartPreview } from '../hooks/use-cart-preview';
import { NumPad } from './numpad';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PaymentEntry } from '@/types/pos.types';

interface PaymentPanelProps {
    onComplete: () => void;
    onCancel: () => void;
    isProcessing?: boolean;
    mode?: 'inline' | 'modal';
    onCreditComplete?: (data: CreditCheckoutData) => void;
    isCreditProcessing?: boolean;
}

interface PaymentMethodOption extends PaymentOption {
    icon: React.ElementType;
}

const KIND_ICONS: Record<PaymentOptionKind, React.ElementType> = {
    cash: Banknote,
    card: CreditCard,
    ewallet: Wallet,
    qris: QrCode,
    bank_transfer: Landmark,
};

const withIcon = (o: PaymentOption): PaymentMethodOption => ({ ...o, icon: KIND_ICONS[o.kind] });

export function PaymentPanel({ onComplete, onCancel, isProcessing = false, mode = 'modal', onCreditComplete, isCreditProcessing = false }: PaymentPanelProps) {
    const { payments, addPayment, removePayment, totalPayments } = useCartStore();
    // Server totals: Rp500 rounding applies only when every payment is cash
    const totals = useCartPreview(true);
    const { hasCreditSales } = useBusinessFeatures();
    const [showCreditCheckout, setShowCreditCheckout] = useState(false);

    // Active payment methods of the business (readable by every POS role). Until they
    // load, or when they cannot be loaded, only cash is offered.
    const methodsQuery = useQuery({
        queryKey: ['pos', 'payment-methods'],
        queryFn: posApi.getPaymentMethods,
        staleTime: 5 * 60 * 1000,
    });
    const paymentMethods = useMemo(
        () => (methodsQuery.data ? toPaymentOptions(methodsQuery.data) : CASH_ONLY).map(withIcon),
        [methodsQuery.data],
    );

    const [selectedMethodId, setSelectedMethodId] = useState<PaymentOption['id']>('cash');
    const selectedMethod = paymentMethods.find((m) => m.id === selectedMethodId) ?? paymentMethods[0]!;
    const [reference, setReference] = useState('');

    const isCash = selectedMethod.id === 'cash';
    const paidCashOnly = payments.every((p) => p.method === 'cash');
    // While paying, the pending entry's method counts; once paid, only recorded payments do
    const totalFor = (cashOnly: boolean) => (cashOnly ? totals.cashTotal : totals.rawTotal);
    const settledTotal = totalFor(paidCashOnly && payments.length > 0);
    const isPaid = payments.length > 0 && totalPayments >= settledTotal;
    const total = isPaid ? settledTotal : totalFor(paidCashOnly && isCash);
    const remaining = Math.max(total - totalPayments, 0);
    const changeDue = isPaid ? Math.max(0, totalPayments - settledTotal) : 0;
    const [amountInput, setAmount] = useState<number | null>(null);
    const amount = amountInput ?? remaining;
    // Only cash can be over-tendered (change). Card/QRIS/e-wallet are capped at the
    // remaining balance and must carry the approval/reference number.
    const exceedsRemaining = !isCash && amount > remaining;
    const missingReference = !isCash && reference.trim() === '';
    const canPay = !totals.isLoading && (isCash
        ? amount > 0 && amount >= remaining
        : amount > 0 && !exceedsRemaining && !missingReference);

    const selectMethod = (method: PaymentMethodOption) => {
        setSelectedMethodId(method.id);
        // Non-cash pays the exact (unrounded) remaining amount
        if (method.id !== 'cash') setAmount(null);
    };

    const handlePay = () => {
        if (!canPay) return;

        const payment: PaymentEntry = {
            method: selectedMethod.id,
            amount: isCash ? amount : Math.min(amount, remaining),
            referenceNumber: reference.trim() || undefined,
        };

        addPayment(payment);

        // Next entry defaults to the (recomputed) remaining amount
        setAmount(null);
        setReference('');
        // When fully paid, the "Selesai" button appears — user clicks it explicitly
    };

    const quickAmounts = selectedMethod.id === 'cash'
        ? Array.from(new Set([
            remaining,
            Math.ceil(remaining / 10000) * 10000,
            Math.ceil(remaining / 50000) * 50000,
            Math.ceil(remaining / 100000) * 100000,
            200000,
        ])).sort((a, b) => a - b).filter(v => v >= remaining).slice(0, 4)
        : [];

    const content = (
        <>
            {/* Header */}
            <CardHeader className={cn("pb-2 pt-3", mode === 'inline' && "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-t-none")}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {mode === 'inline' && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onCancel}
                                className={cn("h-7 w-7", mode === 'inline' && "text-primary-foreground hover:bg-white/20")}
                                aria-label="Kembali ke keranjang"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <CardTitle className="text-lg">Pembayaran</CardTitle>
                    </div>
                    {mode === 'modal' && (
                        <Button variant="ghost" size="icon" onClick={onCancel} className="h-7 w-7" aria-label="Tutup pembayaran">
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent className={cn("space-y-3", mode === 'inline' && "flex-1 overflow-auto")}>
                {!totals.fromServer && !totals.isLoading && totals.error != null && (
                    <p className="text-xs text-orange-600" role="status">
                        Total dari server belum tersedia; memakai perhitungan lokal. Server akan menghitung ulang saat transaksi disimpan.
                    </p>
                )}
                {/* Summary */}
                <div className="flex items-center gap-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg px-4 py-2.5 border border-primary/20">
                    <div className="flex items-baseline gap-2">
                        <span className="text-xs text-muted-foreground">Total:</span>
                        <span className="text-xl font-bold text-primary">
                            {totals.isLoading ? <Loader2 className="inline h-4 w-4 animate-spin" /> : formatCurrency(total)}
                        </span>
                    </div>
                    {totalPayments > 0 && (
                        <>
                            <div className="h-6 w-px bg-primary/20" />
                            <div className="flex items-baseline gap-2">
                                <span className="text-xs text-muted-foreground">
                                    {isPaid ? 'Kembalian:' : 'Sisa:'}
                                </span>
                                <span className={cn(
                                    "text-xl font-bold",
                                    isPaid ? "text-green-600" : "text-orange-600"
                                )}>
                                    {formatCurrency(isPaid ? changeDue : remaining)}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {/* Payment History */}
                {payments.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                        {payments.map((p, idx) => {
                            const method = paymentMethods.find((m) => m.id === p.method);
                            return (
                                <div key={idx} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
                                    {method && <method.icon className="h-3.5 w-3.5" />}
                                    <span className="text-sm font-medium">{method?.name ?? PAYMENT_METHOD_LABELS[p.method] ?? p.method}</span>
                                    <span className="text-sm font-bold">{formatCurrency(p.amount)}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 -mr-1"
                                        onClick={() => removePayment(idx)}
                                        aria-label={`Hapus pembayaran ${method?.name ?? p.method}`}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {!isPaid && (
                    <>
                        {/* Payment Methods */}
                        <div className="space-y-1.5">
                            <Label className="text-sm">Metode Pembayaran</Label>
                            {methodsQuery.isError && (
                                <div className="flex items-center gap-2 text-xs text-orange-600" role="status">
                                    <span>Metode non-tunai gagal dimuat; hanya tunai yang tersedia.</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2"
                                        onClick={() => methodsQuery.refetch()}
                                    >
                                        <RefreshCw className="mr-1 h-3 w-3" /> Muat ulang
                                    </Button>
                                </div>
                            )}
                            <div className={cn(
                                "grid gap-2",
                                mode === 'inline' ? "grid-cols-3" : "flex flex-wrap"
                            )}>
                                {paymentMethods.map((method) => (
                                    <Button
                                        key={method.id}
                                        variant={selectedMethod.id === method.id ? "default" : "outline"}
                                        className={cn(
                                            "flex-col gap-1 h-14",
                                            mode === 'modal' && "flex-1 min-w-[72px]",
                                            selectedMethod.id === method.id && "ring-2 ring-primary ring-offset-1"
                                        )}
                                        onClick={() => selectMethod(method)}
                                        aria-pressed={selectedMethod.id === method.id}
                                    >
                                        <method.icon className="h-3.5 w-3.5" />
                                        <span className="text-[11px]">{method.name}</span>
                                    </Button>
                                ))}
                                {hasCreditSales && (
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "flex-col gap-1 h-14 border-amber-300 text-amber-700 hover:bg-amber-50",
                                            mode === 'modal' && "flex-1",
                                        )}
                                        onClick={() => setShowCreditCheckout(true)}
                                    >
                                        <FileText className="h-3.5 w-3.5" />
                                        <span className="text-[11px]">BON</span>
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Reference for non-cash */}
                        {selectedMethod.id !== 'cash' && (
                            <div className="space-y-1.5">
                                <Label htmlFor="reference" className="text-sm">
                                    No. Referensi / Approval <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="reference"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    placeholder="No. approval dari EDC / aplikasi"
                                    aria-required="true"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Pastikan pembayaran sudah berhasil di mesin EDC / aplikasi sebelum dicatat.
                                </p>
                            </div>
                        )}

                        {/* Amount Input */}
                        <div className={cn(mode === 'modal' ? "flex gap-3" : "space-y-2")}>
                            {/* Quick Amounts */}
                            {selectedMethod.id === 'cash' && quickAmounts.length > 0 && (
                                <div className={cn(mode === 'modal' ? "w-44 space-y-1.5" : "space-y-1.5")}>
                                    <Label className="text-xs">Nominal Cepat</Label>
                                    <div className={cn(mode === 'inline' ? "grid grid-cols-2 gap-1" : "space-y-1")}>
                                        {quickAmounts.map((amt) => (
                                            <Button
                                                key={amt}
                                                variant={amount === amt ? 'default' : 'outline'}
                                                className={cn(
                                                    "h-9 text-sm font-semibold",
                                                    mode === 'modal' && "w-full justify-start"
                                                )}
                                                onClick={() => setAmount(amt)}
                                            >
                                                Rp {amt.toLocaleString('id-ID')}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Numpad */}
                            <div className="flex-1 space-y-1.5">
                                <Label className="text-xs">
                                    Jumlah Bayar
                                    {payments.length > 0 && (
                                        <span className="ml-2 text-[10px] text-muted-foreground">
                                            (min: {formatCurrency(remaining)})
                                        </span>
                                    )}
                                </Label>
                                <div className="bg-muted/30 rounded-lg p-2.5">
                                    <div className="bg-background rounded px-3 py-2 mb-2">
                                        <p className="text-2xl font-bold">
                                            Rp {amount.toLocaleString('id-ID')}
                                        </p>
                                        {isCash && amount > remaining && remaining > 0 && (
                                            <p className="text-sm font-semibold text-green-600 mt-0.5">
                                                Kembalian: {formatCurrency(amount - remaining)}
                                            </p>
                                        )}
                                        {exceedsRemaining && (
                                            <p className="text-sm font-semibold text-destructive mt-0.5">
                                                Non-tunai maksimal {formatCurrency(remaining)}
                                            </p>
                                        )}
                                    </div>
                                    <NumPad
                                        value={amount.toString()}
                                        onChange={(val) => setAmount(parseInt(val) || 0)}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>

            <CardFooter className="border-t pt-3 pb-3">
                {!isPaid ? (
                    <Button
                        className="w-full h-11 text-sm font-semibold"
                        onClick={handlePay}
                        disabled={!canPay}
                    >
                        {payments.length > 0 ? (
                            <>
                                <Plus className="h-4 w-4 mr-2" />
                                Tambah Pembayaran
                            </>
                        ) : (
                            <>
                                <Check className="h-4 w-4 mr-2" />
                                Bayar {formatCurrency(amount)}
                            </>
                        )}
                    </Button>
                ) : (
                    <Button
                        className="w-full h-11 text-sm font-semibold bg-green-600 hover:bg-green-500"
                        onClick={onComplete}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Check className="h-4 w-4 mr-2" />
                        )}
                        {isProcessing ? 'Memproses...' : `Selesai ${changeDue > 0 ? `— Kembalian ${formatCurrency(changeDue)}` : ''}`}
                    </Button>
                )}
            </CardFooter>
        </>
    );

    const creditModal = hasCreditSales && (
        <CreditCheckoutModal
            open={showCreditCheckout}
            onClose={() => setShowCreditCheckout(false)}
            onConfirm={(data) => {
                setShowCreditCheckout(false);
                onCreditComplete?.(data);
            }}
            isProcessing={isCreditProcessing}
        />
    );

    if (mode === 'inline') {
        return (
            <div className="h-full flex flex-col bg-card">
                {content}
                {creditModal}
            </div>
        );
    }

    return (
        <>
            <Dialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
                <DialogContent className="max-w-4xl p-0 gap-0 [&>button]:hidden">
                    <DialogTitle className="sr-only">Pembayaran</DialogTitle>
                    <DialogDescription className="sr-only">Pilih metode dan jumlah pembayaran</DialogDescription>
                    <Card className="w-full border-0 shadow-none">
                        {content}
                    </Card>
                </DialogContent>
            </Dialog>
            {creditModal}
        </>
    );
}
