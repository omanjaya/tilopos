
import { Utensils, ShoppingBag, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/stores/cart.store';
import type { OrderType } from '@/types/pos.types';

interface OrderTypeButtonsProps {
    className?: string;
}

export function OrderTypeButtons({ className }: OrderTypeButtonsProps) {
    const { orderType, setOrderType } = useCartStore();

    const icons: Record<OrderType, React.ElementType> = {
        dine_in: Utensils,
        takeaway: ShoppingBag,
        delivery: Truck,
    };

    const labels: Record<OrderType, string> = {
        dine_in: 'Makan di Tempat',
        takeaway: 'Bawa Pulang',
        delivery: 'Antar',
    };

    return (
        <div className={cn('flex gap-1 bg-muted rounded-lg p-1', className)}>
            {(Object.keys(labels) as OrderType[]).map((type) => {
                const Icon = icons[type];
                const isActive = orderType === type;
                return (
                    <Button
                        key={type}
                        variant={isActive ? 'default' : 'ghost'}
                        size="sm"
                        className={cn('gap-1.5', isActive && 'shadow-md')}
                        onClick={() => setOrderType(type)}
                        aria-label={labels[type]}
                        aria-pressed={isActive}
                    >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{labels[type]}</span>
                    </Button>
                );
            })}
        </div>
    );
}
