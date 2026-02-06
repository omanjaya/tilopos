import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MobileCartBarProps {
    itemsCount: number;
    totalQuantity: number;
    onCartClick: () => void;
}

export function MobileCartBar({ itemsCount, totalQuantity, onCartClick }: MobileCartBarProps) {
    if (itemsCount === 0) {
        return null;
    }

    return (
        <div className="lg:hidden border-t bg-card px-4 py-3 flex items-center justify-between shrink-0">
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
                <span className="font-medium text-sm ml-2">{totalQuantity} item</span>
            </button>
            <Button onClick={onCartClick} className="min-h-[44px] px-6 font-semibold">
                Lihat Keranjang
            </Button>
        </div>
    );
}
