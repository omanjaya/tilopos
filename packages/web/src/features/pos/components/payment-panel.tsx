import { useState } from 'react';
import {
    CreditCard,
    Banknote,
    Wallet,
    QrCode,
    X,
    Check,
    ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCartStore } from '@/stores/cart.store';
import { FullNumPad } from './numpad';
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
    category: 'cash' | 'card' | 'ewallet' | 'qris';
}

const paymentMethods: PaymentMethodOption[] = [
    { id: 'cash', name: 'Tunai', icon: Banknote, category: 'cash' },
    { id: 'qris', name: 'QRIS', icon: QrCode, category: 'qris' },
    { id: 'debit_card', name: 'Kartu Debit', icon: CreditCard, category: 'card' },
    { id: 'credit_card', name: 'Kartu Kredit', icon: CreditCard, category: 'card' },
    { id: 'gopay', name: 'GoPay', icon: Wallet, category: 'ewallet' },
    { id: 'ovo', name: 'OVO', icon: Wallet, category: 'ewallet' },
    { id: 'dana', name: 'DANA', icon: Wallet, category: 'ewallet' },
    { id: 'shopeepay', name: 'ShopeePay', icon: Wallet, category: 'ewallet' },
    { id: 'linkaja', name: 'LinkAja', icon: Wallet, category: 'ewallet' },
];

export function PaymentPanel({ onComplete, onCancel }: PaymentPanelProps) {
    const { total, payments, addPayment, removePayment, totalPayments, changeDue } =
        useCartStore();

    const [step, setStep] = useState<'method' | 'amount'>('method');
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethodOption | null>(null);
    const [amount, setAmount] = useState(0);
    const [reference, setReference] = useState('');

    const remaining = total - totalPayments;
    const isPaid = totalPayments >= total;

    const handleMethodSelect = (method: PaymentMethodOption) => {
        setSelectedMethod(method);
        setAmount(remaining);
        setReference('');
        setStep('amount');
    };

    const handleAddPayment = () => {
        if (!selectedMethod || amount <= 0) return;

        const payment: PaymentEntry = {
            method: selectedMethod.id,
            amount,
            referenceNumber: reference || undefined,
        };

        addPayment(payment);
        setStep('method');
        setSelectedMethod(null);
        setAmount(0);
        setReference('');
    };

    const handleBack = () => {
        setStep('method');
        setSelectedMethod(null);
    };

    const getCategoryLabel = (category: PaymentMethodOption['category']) => {
        switch (category) {
            case 'cash':
                return 'Tunai';
            case 'card':
                return 'Kartu';
            case 'ewallet':
                return 'E-Wallet';
            case 'qris':
                return 'QRIS';
        }
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-2xl">
                <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-t-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {step === 'amount' && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleBack}
                                    className="text-primary-foreground hover:bg-white/20"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                            )}
                            <CardTitle className="text-lg">
                                {step === 'method' ? 'Pilih Metode Pembayaran' : selectedMethod?.name}
                            </CardTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onCancel}
                            className="text-primary-foreground hover:bg-white/20"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-4">
                    {/* Payment Summary */}
                    <div className="bg-muted/50 rounded-xl p-4 mb-4">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Total Tagihan</span>
                            <span className="text-xl font-bold">{formatCurrency(total)}</span>
                        </div>
                        {payments.length > 0 && (
                            <>
                                <Separator className="my-3" />
                                <div className="space-y-2">
                                    {payments.map((p, idx) => {
                                        const method = paymentMethods.find((m) => m.id === p.method);
                                        return (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between text-sm"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {method && <method.icon className="h-4 w-4 text-muted-foreground" />}
                                                    <span>{method?.name || p.method}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span>{formatCurrency(p.amount)}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => removePayment(idx)}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <Separator className="my-3" />
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">
                                        {isPaid ? 'Kembalian' : 'Sisa Pembayaran'}
                                    </span>
                                    <span
                                        className={cn(
                                            'text-lg font-bold',
                                            isPaid ? 'text-green-600' : 'text-orange-500',
                                        )}
                                    >
                                        {formatCurrency(isPaid ? changeDue : remaining)}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {step === 'method' ? (
                        /* Method Selection */
                        <div className="space-y-4">
                            {['cash', 'qris', 'card', 'ewallet'].map((category) => {
                                const methods = paymentMethods.filter(
                                    (m) => m.category === category,
                                );
                                if (methods.length === 0) return null;

                                return (
                                    <div key={category}>
                                        <p className="text-xs font-medium text-muted-foreground mb-2">
                                            {getCategoryLabel(category as PaymentMethodOption['category'])}
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {methods.map((method) => (
                                                <Button
                                                    key={method.id}
                                                    variant="outline"
                                                    className="h-16 flex-col gap-1 hover:border-primary hover:bg-primary/5"
                                                    onClick={() => handleMethodSelect(method)}
                                                    disabled={isPaid}
                                                >
                                                    <method.icon className="h-5 w-5" />
                                                    <span className="text-sm">{method.name}</span>
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* Amount Input */
                        <div className="space-y-4">
                            {selectedMethod?.category !== 'cash' && (
                                <div>
                                    <Label htmlFor="reference">Nomor Referensi (opsional)</Label>
                                    <Input
                                        id="reference"
                                        value={reference}
                                        onChange={(e) => setReference(e.target.value)}
                                        placeholder="Nomor transaksi/approval"
                                        className="mt-1"
                                    />
                                </div>
                            )}

                            <FullNumPad
                                label="Jumlah Bayar"
                                value={amount}
                                onChange={setAmount}
                                showQuickAmounts={selectedMethod?.id === 'cash'}
                                quickAmounts={[
                                    Math.ceil(remaining / 10000) * 10000,
                                    Math.ceil(remaining / 50000) * 50000,
                                    Math.ceil(remaining / 100000) * 100000,
                                    200000,
                                ]}
                            />

                            <Button
                                className="w-full h-14 text-lg"
                                onClick={handleAddPayment}
                                disabled={amount <= 0}
                            >
                                <Check className="h-5 w-5 mr-2" />
                                Tambah Pembayaran
                            </Button>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="border-t p-4">
                    <Button
                        className="w-full h-14 text-lg bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400"
                        onClick={onComplete}
                        disabled={!isPaid}
                    >
                        <Check className="h-5 w-5 mr-2" />
                        {isPaid
                            ? `Selesai — Kembalian ${formatCurrency(changeDue)}`
                            : `Kurang ${formatCurrency(remaining)}`}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
