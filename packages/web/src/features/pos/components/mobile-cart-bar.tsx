import { ShoppingCart, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';

interface MobileCartBarProps {
    itemsCount: number;
    totalQuantity: number;
    total: number;
    onCartClick: () => void;
    onQuickCashCheckout?: () => void;
}

export function MobileCartBar({ itemsCount, totalQuantity, total, onCartClick, onQuickCashCheckout }: MobileCartBarProps) {
    if (itemsCount === 0) {
        return null;
    }

    return (
        <div className="lg:hidden border-t bg-card px-4 py-3 flex items-center gap-3 shrink-0">
            <button
                onClick={onCartClick}
                className="flex items-center gap-3 flex-1 min-h-[44px]"
            >
                <div className="relative">
                    <ShoppingCart className="h-5 w-5" />
                    <Badge
                        variant="destructive"
                        className="absolute -top-2 -right-3 h-5 min-w-[1.25rem] p-0 flex items-center justify-center text-[10px]"
                    >
                        {itemsCount}
                    </Badge>
                </div>
                <div className="text-left ml-2">
                    <p className="font-bold text-sm">{formatCurrency(total)}</p>
                    <p className="text-[10px] text-muted-foreground">{totalQuantity} item</p>
                </div>
            </button>
            <Button
                onClick={onQuickCashCheckout}
                className="min-h-[44px] px-4 font-semibold bg-green-600 hover:bg-green-500"
            >
                <Banknote className="h-4 w-4 mr-1.5" />
                Uang Pas
            </Button>
            <Button onClick={onCartClick} variant="outline" className="min-h-[44px] px-4 font-semibold">
                Bayar
            </Button>
        </div>
    );
}
