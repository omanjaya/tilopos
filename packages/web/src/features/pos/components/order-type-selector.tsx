
import { Utensils, ShoppingBag, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/stores/cart.store';
import type { OrderType } from '@/types/pos.types';

interface OrderTypeSelectorProps {
    open: boolean;
    onClose: () => void;
}

interface OrderTypeOption {
    id: OrderType;
    label: string;
    description: string;
    icon: React.ElementType;
    color: string;
}

const orderTypes: OrderTypeOption[] = [
    {
        id: 'dine_in',
        label: 'Makan di Tempat',
        description: 'Pelanggan makan di restoran',
        icon: Utensils,
        color: 'from-blue-500 to-blue-600',
    },
    {
        id: 'takeaway',
        label: 'Bawa Pulang',
        description: 'Pelanggan membawa pulang pesanan',
        icon: ShoppingBag,
        color: 'from-green-500 to-green-600',
    },
    {
        id: 'delivery',
        label: 'Delivery',
        description: 'Pesanan dikirim ke lokasi pelanggan',
        icon: Truck,
        color: 'from-orange-500 to-orange-600',
    },
];

export function OrderTypeSelector({ open, onClose }: OrderTypeSelectorProps) {
    const { orderType, setOrderType } = useCartStore();

    const handleSelect = (type: OrderType) => {
        setOrderType(type);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Pilih Tipe Pesanan</DialogTitle>
                </DialogHeader>

                <div className="grid gap-3">
                    {orderTypes.map((option) => (
                        <Button
                            key={option.id}
                            variant="outline"
                            className={cn(
                                'h-auto p-4 justify-start hover:scale-[1.02] transition-all',
                                orderType === option.id && 'border-2 border-primary bg-primary/5',
                            )}
                            onClick={() => handleSelect(option.id)}
                        >
                            <div
                                className={cn(
                                    'h-12 w-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br mr-4 shrink-0',
                                    option.color,
                                )}
                            >
                                <option.icon className="h-6 w-6" />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold">{option.label}</p>
                                <p className="text-sm text-muted-foreground">{option.description}</p>
                            </div>
                        </Button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Inline order type buttons for header
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
        dine_in: 'Dine In',
        takeaway: 'Take Away',
        delivery: 'Delivery',
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
                    >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{labels[type]}</span>
                    </Button>
                );
            })}
        </div>
    );
}
