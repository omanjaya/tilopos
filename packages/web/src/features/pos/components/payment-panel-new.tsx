import { useState } from 'react';
import {
    CreditCard,
    Banknote,
    Wallet,
    QrCode,
    X,
    Check,
    Plus,
} from 'lucide-react';
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
import { useCartStore } from '@/stores/cart.store';
import { NumPad } from './numpad';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PaymentMethod, PaymentEntry } from '@/types/pos.types';

interface PaymentPanelProps {
    onComplete: () => void;
    onCancel: () => void;
}

interface PaymentMethodOption {
    id: PaymentMethod;
    name: string;
    icon: React.ElementType;
    color: string;
}

const paymentMethods: PaymentMethodOption[] = [
    { id: 'cash', name: 'Tunai', icon: Banknote, color: 'bg-green-500' },
    { id: 'qris', name: 'QRIS', icon: QrCode, color: 'bg-blue-500' },
    { id: 'debit_card', name: 'Debit', icon: CreditCard, color: 'bg-purple-500' },
    { id: 'credit_card', name: 'Kredit', icon: CreditCard, color: 'bg-purple-600' },
    { id: 'gopay', name: 'GoPay', icon: Wallet, color: 'bg-teal-500' },
    { id: 'ovo', name: 'OVO', icon: Wallet, color: 'bg-purple-500' },
];

export function PaymentPanel({ onComplete, onCancel }: PaymentPanelProps) {
    const { total, payments, addPayment, removePayment, totalPayments, changeDue } =
        useCartStore();

    const [selectedMethod, setSelectedMethod] = useState<PaymentMethodOption>(paymentMethods[0]!);
    const [amount, setAmount] = useState(total);
    const [reference, setReference] = useState('');

    const remaining = total - totalPayments;
    const isPaid = totalPayments >= total;

    const handlePay = () => {
        if (amount <= 0) return;

        const payment: PaymentEntry = {
            method: selectedMethod.id,
            amount,
            referenceNumber: reference || undefined,
        };

        addPayment(payment);

        // Calculate new total after this payment
        const newTotalPayments = totalPayments + amount;

        // Reset for next payment if split, otherwise user will click "Selesai" button
        if (newTotalPayments < total) {
            setAmount(total - newTotalPayments);
            setReference('');
        }
        // Note: Don't auto-call onComplete() - let user click "Selesai" button
        // This ensures payment is properly saved to store before creating transaction
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

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl shadow-2xl">
                {/* Header - Compact */}
                <CardHeader className="pb-2 pt-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Pembayaran</CardTitle>
                        <Button variant="ghost" size="icon" onClick={onCancel} className="h-7 w-7">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-3">
                    {/* Summary - Horizontal Compact */}
                    <div className="flex items-center gap-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg px-4 py-2.5 border border-primary/20">
                        <div className="flex items-baseline gap-2">
                            <span className="text-xs text-muted-foreground">Total:</span>
                            <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
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

                    {/* Payment History - Inline Compact */}
                    {payments.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            {payments.map((p, idx) => {
                                const method = paymentMethods.find((m) => m.id === p.method);
                                return (
                                    <div key={idx} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
                                        {method && <method.icon className="h-3.5 w-3.5" />}
                                        <span className="text-sm font-medium">{method?.name}</span>
                                        <span className="text-sm font-bold">{formatCurrency(p.amount)}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 -mr-1"
                                            onClick={() => removePayment(idx)}
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
                            {/* Payment Methods + Reference - Single Row */}
                            <div className="flex gap-3 items-end">
                                <div className="flex-1 space-y-1.5">
                                    <Label className="text-sm">Metode Pembayaran</Label>
                                    <div className="flex gap-2">
                                        {paymentMethods.map((method) => (
                                            <Button
                                                key={method.id}
                                                variant={selectedMethod.id === method.id ? "default" : "outline"}
                                                className={cn(
                                                    "flex-1 flex-col gap-1 h-14",
                                                    selectedMethod.id === method.id && "ring-2 ring-primary ring-offset-1"
                                                )}
                                                onClick={() => setSelectedMethod(method)}
                                            >
                                                <method.icon className="h-3.5 w-3.5" />
                                                <span className="text-[11px]">{method.name}</span>
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                {/* Reference inline for non-cash */}
                                {selectedMethod.id !== 'cash' && (
                                    <div className="w-64 space-y-1.5">
                                        <Label htmlFor="reference" className="text-sm">
                                            No. Referensi <span className="text-muted-foreground text-xs">(opsional)</span>
                                        </Label>
                                        <Input
                                            id="reference"
                                            value={reference}
                                            onChange={(e) => setReference(e.target.value)}
                                            placeholder="No. approval"
                                            className="h-14"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Amount Input - Compact */}
                            <div className="flex gap-3">
                                {/* Quick Amounts */}
                                {selectedMethod.id === 'cash' && quickAmounts.length > 0 && (
                                    <div className="w-44 space-y-1.5">
                                        <Label className="text-xs">Nominal Cepat</Label>
                                        <div className="space-y-1">
                                            {quickAmounts.map((amt) => (
                                                <Button
                                                    key={amt}
                                                    variant={amount === amt ? 'default' : 'outline'}
                                                    className="w-full h-9 justify-start text-sm font-semibold"
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
                            disabled={amount <= 0 || amount < remaining}
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
                        >
                            <Check className="h-4 w-4 mr-2" />
                            Selesai {changeDue > 0 && `— Kembalian ${formatCurrency(changeDue)}`}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
