import { Trash2, Plus, Minus, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/stores/cart.store';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CartItem } from '@/types/pos.types';

interface CartPanelProps {
    onCheckout: () => void;
    onHoldBill: () => void;
    onItemEdit?: (item: CartItem) => void;
}

export function CartPanel({ onCheckout, onHoldBill, onItemEdit }: CartPanelProps) {
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
        removeItem,
    } = useCartStore();

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
                                onEdit={() => onItemEdit?.(item)}
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
                            <SummaryRow label="Biaya Layanan (5%)" value={serviceCharge} />
                        )}
                        <SummaryRow label="Pajak (PPN 11%)" value={taxAmount} />
                        <Separator className="my-2" />
                        <div className="flex items-center justify-between font-bold text-lg">
                            <span>Total</span>
                            <span className="text-primary">{formatCurrency(total)}</span>
                        </div>
                    </div>

                    <CardFooter className="flex-col gap-2 p-4 border-t">
                        <Button
                            onClick={onCheckout}
                            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                            size="lg"
                        >
                            Bayar — {formatCurrency(total)}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={onHoldBill}
                            className="w-full"
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
    onEdit?: () => void;
}

function CartItemRow({ item, onQuantityChange, onRemove, onEdit }: CartItemRowProps) {
    const modifiersTotal = item.modifiers.reduce((sum, m) => sum + m.price, 0);
    const itemTotal = (item.price + modifiersTotal) * item.quantity;

    return (
        <div className="p-4 hover:bg-muted/30 transition-colors group">
            <div className="flex items-start gap-3">
                {/* Product Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                        <div>
                            <h4 className="font-medium text-sm">{item.name}</h4>
                            {item.variantName && (
                                <span className="text-xs text-muted-foreground">
                                    {item.variantName}
                                </span>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="font-semibold text-sm">{formatCurrency(itemTotal)}</p>
                            <p className="text-xs text-muted-foreground">
                                @ {formatCurrency(item.price + modifiersTotal)}
                            </p>
                        </div>
                    </div>

                    {/* Modifiers */}
                    {item.modifiers.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                            {item.modifiers.map((mod) => (
                                <Badge
                                    key={mod.id}
                                    variant="secondary"
                                    className="text-xs font-normal"
                                >
                                    + {mod.name} ({formatCurrency(mod.price)})
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Notes */}
                    {item.notes && (
                        <p className="mt-1 text-xs text-muted-foreground italic">
                            Catatan: {item.notes}
                        </p>
                    )}
                </div>
            </div>

            {/* Quantity Controls */}
            <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onEdit}
                            className="h-8 w-8 p-0"
                        >
                            <Edit3 className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRemove}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onQuantityChange(item.quantity - 1)}
                        className="h-8 w-8 p-0"
                    >
                        <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-10 text-center font-semibold tabular-nums">
                        {item.quantity}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onQuantityChange(item.quantity + 1)}
                        className="h-8 w-8 p-0"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>
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
