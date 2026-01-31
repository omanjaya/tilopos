import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { POSProduct, POSProductVariant, POSModifier, CartItem } from '@/types/pos.types';
import { useCartStore } from '@/stores/cart.store';

interface ProductModalProps {
    product: POSProduct | null;
    open: boolean;
    onClose: () => void;
}

export function ProductModal({ product, open, onClose }: ProductModalProps) {
    const { addItem } = useCartStore();

    const [selectedVariant, setSelectedVariant] = useState<POSProductVariant | null>(null);
    const [selectedModifiers, setSelectedModifiers] = useState<POSModifier[]>([]);
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');

    const hasVariants = product && product.variants.length > 0;
    const price = selectedVariant?.price ?? product?.basePrice ?? 0;
    const modifiersTotal = selectedModifiers.reduce((sum, m) => sum + m.price, 0);
    const totalPrice = (price + modifiersTotal) * quantity;

    const handleVariantSelect = (variant: POSProductVariant) => {
        setSelectedVariant(variant);
    };

    const handleModifierToggle = (modifier: POSModifier) => {
        setSelectedModifiers((prev) => {
            const exists = prev.find((m) => m.id === modifier.id);
            if (exists) {
                return prev.filter((m) => m.id !== modifier.id);
            }
            return [...prev, modifier];
        });
    };

    const handleAddToCart = () => {
        if (!product) return;

        const cartItem: Omit<CartItem, 'id'> = {
            productId: product.id,
            variantId: selectedVariant?.id,
            name: product.name,
            variantName: selectedVariant?.name,
            price: selectedVariant?.price ?? product.basePrice,
            quantity,
            modifiers: selectedModifiers.map((m) => ({
                id: m.id,
                name: m.name,
                price: m.price,
            })),
            notes: notes || undefined,
            imageUrl: product.imageUrl,
        };

        addItem(cartItem);
        handleClose();
    };

    const handleClose = () => {
        setSelectedVariant(null);
        setSelectedModifiers([]);
        setQuantity(1);
        setNotes('');
        onClose();
    };

    if (!product) return null;

    return (
        <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="pb-0">
                    <div className="flex items-start gap-4">
                        {/* Product Image */}
                        <div className="h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-muted">
                            {product.imageUrl ? (
                                <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                                    <span className="text-2xl font-bold text-primary/30">
                                        {product.name.charAt(0)}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <DialogTitle className="text-xl">{product.name}</DialogTitle>
                            <p className="text-lg font-semibold text-primary mt-1">
                                {formatCurrency(product.basePrice)}
                            </p>
                            {product.categoryName && (
                                <Badge variant="secondary" className="mt-2">
                                    {product.categoryName}
                                </Badge>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto py-4 space-y-6">
                    {/* Variants */}
                    {hasVariants && (
                        <div>
                            <Label className="text-sm font-medium mb-3 block">Pilih Varian</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {product.variants.map((variant) => (
                                    <Button
                                        key={variant.id}
                                        variant={selectedVariant?.id === variant.id ? 'default' : 'outline'}
                                        className={cn(
                                            'h-auto py-3 px-4 justify-between',
                                            selectedVariant?.id === variant.id && 'ring-2 ring-primary',
                                        )}
                                        onClick={() => handleVariantSelect(variant)}
                                    >
                                        <span>{variant.name}</span>
                                        <span className="font-semibold">{formatCurrency(variant.price)}</span>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Modifiers */}
                    {product.modifierGroups.map((group) => (
                        <div key={group.id}>
                            <div className="flex items-center gap-2 mb-3">
                                <Label className="text-sm font-medium">{group.name}</Label>
                                {group.required && (
                                    <Badge variant="destructive" className="text-xs">
                                        Wajib
                                    </Badge>
                                )}
                                {group.maxSelect > 1 && (
                                    <span className="text-xs text-muted-foreground">
                                        (Maks. {group.maxSelect})
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {group.modifiers.map((modifier) => {
                                    const isSelected = selectedModifiers.some((m) => m.id === modifier.id);
                                    return (
                                        <Button
                                            key={modifier.id}
                                            variant={isSelected ? 'default' : 'outline'}
                                            className="h-auto py-2 px-3 justify-between"
                                            onClick={() => handleModifierToggle(modifier)}
                                        >
                                            <span className="text-sm">{modifier.name}</span>
                                            <span className="text-sm font-medium">
                                                +{formatCurrency(modifier.price)}
                                            </span>
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Quantity */}
                    <div>
                        <Label className="text-sm font-medium mb-3 block">Jumlah</Label>
                        <div className="flex items-center justify-center gap-4">
                            <Button
                                variant="outline"
                                size="lg"
                                className="h-12 w-12"
                                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            >
                                -
                            </Button>
                            <span className="text-3xl font-bold w-16 text-center tabular-nums">
                                {quantity}
                            </span>
                            <Button
                                variant="outline"
                                size="lg"
                                className="h-12 w-12"
                                onClick={() => setQuantity((q) => q + 1)}
                            >
                                +
                            </Button>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <Label htmlFor="notes" className="text-sm font-medium mb-3 block">
                            Catatan (Opsional)
                        </Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Contoh: Jangan pakai MSG, level pedas 3..."
                            className="resize-none"
                            rows={2}
                        />
                    </div>
                </div>

                <Separator />

                <DialogFooter className="pt-4">
                    <div className="w-full flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="text-2xl font-bold text-primary">{formatCurrency(totalPrice)}</p>
                        </div>
                        <Button
                            size="lg"
                            className="h-14 px-8 text-lg bg-gradient-to-r from-primary to-primary/80 shadow-lg"
                            onClick={handleAddToCart}
                            disabled={Boolean(hasVariants && !selectedVariant)}
                        >
                            Tambah ke Keranjang
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
