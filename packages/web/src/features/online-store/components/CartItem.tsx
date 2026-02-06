import type { CartItem as CartItemType } from '../types/storefront.types';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface CartItemProps {
  item: CartItemType;
  itemTotal: number;
  onUpdateQuantity: (delta: number) => void;
  onRemove: () => void;
}

export function CartItem({ item, itemTotal, onUpdateQuantity, onRemove }: CartItemProps) {
  return (
    <div className="flex gap-3 pb-4 border-b">
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="h-16 w-16 rounded object-cover"
        />
      )}
      <div className="flex-1">
        <h4 className="font-medium">{item.name}</h4>
        {item.variant && <p className="text-sm text-muted-foreground">{item.variant.name}</p>}
        {item.modifiers && item.modifiers.length > 0 && (
          <p className="text-xs text-muted-foreground">
            + {item.modifiers.map((m) => m.name).join(', ')}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onUpdateQuantity(-1)}
        >
          −
        </Button>
        <span className="w-8 text-center">{item.quantity}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onUpdateQuantity(1)}
        >
          +
        </Button>
      </div>
      <p className="font-semibold">{formatCurrency(itemTotal)}</p>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
