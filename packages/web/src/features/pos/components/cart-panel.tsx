import { useState } from 'react';
import { Trash2, Plus, Minus, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/stores/cart.store';
import { useUIStore } from '@/stores/ui.store';
import { useBusinessFeatures } from '@/hooks/use-business-features';
import { formatCurrency } from '@/lib/format';
import { formatQuantity } from '@/lib/quantity-format';
import { cn } from '@/lib/utils';
import type { CartItem } from '@/types/pos.types';

interface CartPanelProps {
    onCheckout: () => void;
    onHoldBill: () => void;
    onQuickCashCheckout?: () => void;
}

export function CartPanel({ onCheckout, onHoldBill, onQuickCashCheckout }: CartPanelProps) {
    const {
        items,
        customerName,
        tableName,
        orderType,
        subtotal,
        discountTotal,
        serviceCharge,
        taxAmount,
        total,
        updateItemQuantity,
        updateItemPrice,
        removeItem,
    } = useCartStore();
    const { taxRate, serviceChargeRate } = useUIStore();
    const { hasPriceEditing, hasDecimalQuantities } = useBusinessFeatures();

    const orderTypeLabels = {
        dine_in: 'Makan di Tempat',
        takeaway: 'Bawa Pulang',
        delivery: 'Delivery',
    };

    return (
        <Card className="h-full flex flex-col border-0 rounded-none bg-card shadow-2xl">
            {/* Header */}
            <CardHeader className="pb-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-t-none">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Pesanan</CardTitle>
                    <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                        {orderTypeLabels[orderType]}
                    </Badge>
                </div>
                {(customerName || tableName) && (
                    <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
                        {tableName && <span>Meja: {tableName}</span>}
                        {customerName && tableName && <span>•</span>}
                        {customerName && <span>{customerName}</span>}
                    </div>
                )}
            </CardHeader>

            {/* Cart Items */}
            <CardContent className="flex-1 overflow-auto p-0">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                        <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                            <svg
                                className="h-10 w-10 opacity-50"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                                />
                            </svg>
                        </div>
                        <p className="font-medium">Keranjang kosong</p>
                        <p className="text-sm">Pilih produk untuk memulai</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {items.map((item) => (
                            <CartItemRow
                                key={item.id}
                                item={item}
                                onQuantityChange={(qty) => updateItemQuantity(item.id, qty)}
                                onRemove={() => removeItem(item.id)}
                                allowPriceEdit={hasPriceEditing}
                                onPriceChange={(price) => updateItemPrice(item.id, price)}
                                allowDecimalQty={hasDecimalQuantities}
                            />
                        ))}
                    </div>
                )}
            </CardContent>

            {/* Summary & Actions */}
            {items.length > 0 && (
                <>
                    <div className="px-4 py-3 bg-muted/30 space-y-2">
                        <SummaryRow label="Subtotal" value={subtotal} />
                        {discountTotal > 0 && (
                            <SummaryRow label="Diskon" value={-discountTotal} isDiscount />
                        )}
                        {serviceCharge > 0 && (
                            <SummaryRow label={`Layanan (${(serviceChargeRate * 100).toFixed(0)}%)`} value={serviceCharge} />
                        )}
                        <SummaryRow label={`PPN (${(taxRate * 100).toFixed(0)}%)`} value={taxAmount} />
                        <Separator className="my-2" />
                        <div className="flex items-center justify-between font-bold text-lg">
                            <span>Total</span>
                            <span className="text-primary">{formatCurrency(total)}</span>
                        </div>
                    </div>

                    <CardFooter className="flex-col gap-2 p-4 border-t">
                        <div className="flex gap-2 w-full">
                            <Button
                                onClick={onQuickCashCheckout}
                                className="flex-1 h-14 text-base font-semibold bg-green-600 hover:bg-green-500 shadow-lg"
                                size="lg"
                            >
                                <Banknote className="h-5 w-5 mr-2" />
                                Uang Pas — {formatCurrency(total)}
                            </Button>
                            <Button
                                onClick={onCheckout}
                                variant="outline"
                                className="h-14 px-5 font-semibold"
                                size="lg"
                            >
                                Bayar Lainnya
                            </Button>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={onHoldBill}
                            className="w-full text-sm"
                        >
                            Tahan Pesanan
                        </Button>
                    </CardFooter>
                </>
            )}
        </Card>
    );
}

interface CartItemRowProps {
    item: CartItem;
    onQuantityChange: (quantity: number) => void;
    onRemove: () => void;
    allowPriceEdit?: boolean;
    onPriceChange?: (price: number) => void;
    allowDecimalQty?: boolean;
}

function CartItemRow({ item, onQuantityChange, onRemove, allowPriceEdit, onPriceChange, allowDecimalQty }: CartItemRowProps) {
    const [isEditingPrice, setIsEditingPrice] = useState(false);
    const [isEditingQty, setIsEditingQty] = useState(false);
    const step = allowDecimalQty ? 0.5 : 1;
    const modifiersTotal = item.modifiers.reduce((sum, m) => sum + m.price, 0);
    const itemTotal = (item.price + modifiersTotal) * item.quantity;

    const handlePriceSubmit = (value: string) => {
        const newPrice = Number(value);
        if (newPrice > 0 && onPriceChange) {
            onPriceChange(newPrice);
        }
        setIsEditingPrice(false);
    };

    return (
        <div className="px-4 py-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
                {/* Quantity Controls - LEFT */}
                <div className="flex items-center gap-0.5 bg-muted rounded-lg shrink-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onQuantityChange(item.quantity - step)}
                        className="h-8 w-8 p-0"
                        aria-label="Kurangi jumlah"
                    >
                        <Minus className="h-3.5 w-3.5" />
                    </Button>
                    {isEditingQty ? (
                        <Input
                            autoFocus
                            type="number"
                            step={allowDecimalQty ? '0.001' : '1'}
                            defaultValue={item.quantity}
                            className="w-14 h-7 text-sm text-center p-0"
                            onBlur={(e) => {
                                const val = Number(e.target.value);
                                if (val > 0) onQuantityChange(val);
                                setIsEditingQty(false);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const val = Number(e.currentTarget.value);
                                    if (val > 0) onQuantityChange(val);
                                    setIsEditingQty(false);
                                }
                                if (e.key === 'Escape') setIsEditingQty(false);
                            }}
                        />
                    ) : (
                        <button
                            onClick={() => allowDecimalQty ? setIsEditingQty(true) : undefined}
                            className={cn(
                                'w-8 text-center font-semibold text-sm tabular-nums',
                                allowDecimalQty && 'w-14 cursor-pointer hover:text-primary'
                            )}
                        >
                            {formatQuantity(item.quantity, !!allowDecimalQty)}
                        </button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onQuantityChange(item.quantity + step)}
                        className="h-8 w-8 p-0"
                        aria-label="Tambah jumlah"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </Button>
                </div>

                {/* Product Info - CENTER */}
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{item.name}</h4>
                    {item.variantName && (
                        <span className="text-xs text-muted-foreground">{item.variantName}</span>
                    )}
                    {item.modifiers.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                            {item.modifiers.map((mod) => (
                                <span key={mod.id} className="text-[10px] text-muted-foreground">
                                    +{mod.name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Price + Delete - RIGHT */}
                <div className="flex items-center gap-2 shrink-0">
                    {isEditingPrice ? (
                        <Input
                            autoFocus
                            type="number"
                            defaultValue={item.price}
                            className="w-24 h-7 text-sm text-right"
                            onBlur={(e) => handlePriceSubmit(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handlePriceSubmit(e.currentTarget.value);
                                if (e.key === 'Escape') setIsEditingPrice(false);
                            }}
                        />
                    ) : allowPriceEdit ? (
                        <button
                            onClick={() => setIsEditingPrice(true)}
                            className="text-right"
                            aria-label="Ubah harga"
                        >
                            {item.originalPrice && (
                                <p className="text-[10px] text-muted-foreground line-through tabular-nums">
                                    {formatCurrency(item.originalPrice)}
                                </p>
                            )}
                            <p className="font-semibold text-sm tabular-nums text-blue-600 dark:text-blue-400 underline decoration-dashed">
                                {formatCurrency(itemTotal)}
                            </p>
                        </button>
                    ) : (
                        <p className="font-semibold text-sm tabular-nums">{formatCurrency(itemTotal)}</p>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRemove}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        aria-label="Hapus item"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
            {item.notes && (
                <p className="mt-1 ml-[88px] text-xs text-muted-foreground italic">
                    Catatan: {item.notes}
                </p>
            )}
        </div>
    );
}

interface SummaryRowProps {
    label: string;
    value: number;
    isDiscount?: boolean;
}

function SummaryRow({ label, value, isDiscount = false }: SummaryRowProps) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className={cn(isDiscount && 'text-green-600 dark:text-green-400')}>
                {isDiscount ? '-' : ''}{formatCurrency(Math.abs(value))}
            </span>
        </div>
    );
}
