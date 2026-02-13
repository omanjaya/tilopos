import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Layers } from 'lucide-react';

import { formatCurrency } from '@/lib/format';
import type { BundlePackage } from '@/types/bundle.types';
import type { CartItem } from '@/types/pos.types';
import { useCartStore } from '@/stores/cart.store';

interface BundleModalProps {
    bundle: BundlePackage | null;
    open: boolean;
    onClose: () => void;
}

export function BundleModal({ bundle, open, onClose }: BundleModalProps) {
    const { addItem } = useCartStore();

    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');

    const totalPrice = (bundle?.price ?? 0) * quantity;

    const handleAddToCart = () => {
        if (!bundle) return;

        const cartItem: Omit<CartItem, 'id'> = {
            productId: `bundle-${bundle.id}`,
            bundleId: bundle.id,
            name: bundle.name,
            price: bundle.price,
            quantity,
            modifiers: [],
            notes: notes || undefined,
            imageUrl: bundle.imageUrl ?? undefined,
        };

        addItem(cartItem);
        handleClose();
    };

    const handleClose = () => {
        setQuantity(1);
        setNotes('');
        onClose();
    };

    if (!bundle) return null;

    return (
        <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="pb-0">
                    <div className="flex items-start gap-4">
                        <div className="h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-muted">
                            {bundle.imageUrl ? (
                                <img
                                    src={bundle.imageUrl}
                                    alt={bundle.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                                    <Layers className="h-8 w-8 text-primary/30" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <DialogTitle className="text-xl">{bundle.name}</DialogTitle>
                            <p className="text-lg font-semibold text-primary mt-1">
                                {formatCurrency(bundle.price)}
                            </p>
                            <Badge variant="secondary" className="mt-2">
                                <Layers className="h-3 w-3 mr-1" />
                                {bundle.items.length} item
                            </Badge>
                        </div>
                    </div>
                    <DialogDescription className="sr-only">Detail paket bundle</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto py-4 space-y-6">
                    {/* Bundle Items */}
                    <div>
                        <Label className="text-sm font-medium mb-3 block">Isi Paket</Label>
                        <div className="space-y-2">
                            {bundle.items.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                                    <div className="h-8 w-8 shrink-0 rounded bg-background flex items-center justify-center text-xs font-bold text-muted-foreground">
                                        {item.quantity}x
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{item.product.name}</p>
                                        {item.variant && (
                                            <p className="text-xs text-muted-foreground">{item.variant.name}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

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
                        <Label htmlFor="bundle-notes" className="text-sm font-medium mb-3 block">
                            Catatan (Opsional)
                        </Label>
                        <Textarea
                            id="bundle-notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Contoh: Jangan pakai MSG..."
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
                        >
                            Tambah ke Keranjang
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
