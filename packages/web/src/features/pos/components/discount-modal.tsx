import { useState } from 'react';
import { Percent, DollarSign, Tag, X, Check } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/stores/cart.store';

interface DiscountModalProps {
    open: boolean;
    onClose: () => void;
}

// Quick discount presets
const PERCENT_PRESETS = [5, 10, 15, 20, 25, 50];
const AMOUNT_PRESETS = [5000, 10000, 20000, 50000, 100000];

export function DiscountModal({ open, onClose }: DiscountModalProps) {
    const subtotal = useCartStore((s) => s.subtotal);
    const currentDiscountAmount = useCartStore((s) => s.discountAmount);
    const currentDiscountPercent = useCartStore((s) => s.discountPercent);
    const setDiscountAmount = useCartStore((s) => s.setDiscountAmount);
    const setDiscountPercent = useCartStore((s) => s.setDiscountPercent);

    const [tab, setTab] = useState<'percent' | 'amount'>(
        currentDiscountPercent > 0 ? 'percent' : 'amount'
    );
    const [percentValue, setPercentValue] = useState(
        currentDiscountPercent > 0 ? currentDiscountPercent.toString() : ''
    );
    const [amountValue, setAmountValue] = useState(
        currentDiscountAmount > 0 ? currentDiscountAmount.toString() : ''
    );

    // Calculate preview
    const numPercent = parseFloat(percentValue) || 0;
    const numAmount = parseFloat(amountValue) || 0;
    const previewDiscount = tab === 'percent'
        ? Math.round((subtotal * numPercent) / 100)
        : numAmount;
    const afterDiscount = Math.max(0, subtotal - previewDiscount);

    const handleApply = () => {
        if (tab === 'percent') {
            setDiscountPercent(Math.min(100, Math.max(0, numPercent)));
        } else {
            setDiscountAmount(Math.min(subtotal, Math.max(0, numAmount)));
        }
        onClose();
    };

    const handleClear = () => {
        setDiscountAmount(0);
        setDiscountPercent(0);
        setPercentValue('');
        setAmountValue('');
        onClose();
    };

    const handlePercentPreset = (value: number) => {
        setPercentValue(value.toString());
    };

    const handleAmountPreset = (value: number) => {
        setAmountValue(value.toString());
    };

    // Numpad for input
    const handleNumpad = (key: string) => {
        if (tab === 'percent') {
            if (key === 'C') {
                setPercentValue('');
            } else if (key === 'BS') {
                setPercentValue((v) => v.slice(0, -1));
            } else if (key === '.') {
                if (!percentValue.includes('.')) {
                    setPercentValue((v) => v + '.');
                }
            } else {
                const newValue = percentValue + key;
                const num = parseFloat(newValue);
                if (!isNaN(num) && num <= 100) {
                    setPercentValue(newValue);
                }
            }
        } else {
            if (key === 'C') {
                setAmountValue('');
            } else if (key === 'BS') {
                setAmountValue((v) => v.slice(0, -1));
            } else if (key === '.') {
                // No decimal for amount
            } else {
                setAmountValue((v) => v + key);
            }
        }
    };

    const hasDiscount = currentDiscountAmount > 0 || currentDiscountPercent > 0;

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5 text-primary" />
                        Diskon Transaksi
                    </DialogTitle>
                    <DialogDescription>
                        Tambahkan diskon untuk seluruh transaksi
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={tab} onValueChange={(v) => setTab(v as 'percent' | 'amount')}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="percent" className="gap-2">
                            <Percent className="h-4 w-4" />
                            Persen
                        </TabsTrigger>
                        <TabsTrigger value="amount" className="gap-2">
                            <DollarSign className="h-4 w-4" />
                            Nominal
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="percent" className="space-y-4">
                        {/* Percent Input */}
                        <div className="space-y-2">
                            <Label>Diskon Persen (%)</Label>
                            <div className="relative">
                                <Input
                                    type="text"
                                    placeholder="0"
                                    value={percentValue}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (/^\d*\.?\d*$/.test(val)) {
                                            const num = parseFloat(val);
                                            if (isNaN(num) || num <= 100) {
                                                setPercentValue(val);
                                            }
                                        }
                                    }}
                                    className="text-2xl font-bold text-right pr-12 h-14"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground">
                                    %
                                </span>
                            </div>
                        </div>

                        {/* Presets */}
                        <div className="flex flex-wrap gap-2">
                            {PERCENT_PRESETS.map((preset) => (
                                <Button
                                    key={preset}
                                    variant={percentValue === preset.toString() ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handlePercentPreset(preset)}
                                >
                                    {preset}%
                                </Button>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="amount" className="space-y-4">
                        {/* Amount Input */}
                        <div className="space-y-2">
                            <Label>Diskon Nominal (Rp)</Label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground">
                                    Rp
                                </span>
                                <Input
                                    type="text"
                                    placeholder="0"
                                    value={amountValue ? parseInt(amountValue).toLocaleString('id-ID') : ''}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setAmountValue(val);
                                    }}
                                    className="text-2xl font-bold text-right h-14 pl-14"
                                />
                            </div>
                        </div>

                        {/* Presets */}
                        <div className="flex flex-wrap gap-2">
                            {AMOUNT_PRESETS.map((preset) => (
                                <Button
                                    key={preset}
                                    variant={amountValue === preset.toString() ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleAmountPreset(preset)}
                                >
                                    {formatCurrency(preset)}
                                </Button>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'BS'].map((key) => (
                        <Button
                            key={key}
                            variant="outline"
                            className={cn(
                                'h-12 text-lg font-semibold',
                                key === 'C' && 'text-red-500',
                                key === 'BS' && 'text-yellow-600'
                            )}
                            onClick={() => handleNumpad(key)}
                        >
                            {key === 'BS' ? '⌫' : key}
                        </Button>
                    ))}
                </div>

                {/* Preview */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Diskon</span>
                        <span className="text-green-600">-{formatCurrency(previewDiscount)}</span>
                    </div>
                    <div className="flex items-center justify-between font-bold text-lg border-t pt-2">
                        <span>Setelah Diskon</span>
                        <span className="text-primary">{formatCurrency(afterDiscount)}</span>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    {hasDiscount && (
                        <Button variant="outline" onClick={handleClear} className="gap-2">
                            <X className="h-4 w-4" />
                            Hapus Diskon
                        </Button>
                    )}
                    <Button onClick={handleApply} className="gap-2">
                        <Check className="h-4 w-4" />
                        Terapkan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
