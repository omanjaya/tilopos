import type { CartItem as CartItemType } from '../types/storefront.types';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { CartItem } from './CartItem';
import { clsx } from 'clsx';

interface CartPanelProps {
  open: boolean;
  onClose: () => void;
  cart: CartItemType[];
  getItemTotal: (item: CartItemType) => number;
  updateQuantity: (productId: string, variantId: string | undefined, delta: number) => void;
  removeItem: (productId: string, variantId: string | undefined) => void;
  onCheckout: () => void;
}

export function CartPanel({
  open,
  onClose,
  cart,
  getItemTotal,
  updateQuantity,
  removeItem,
  onCheckout,
}: CartPanelProps) {
  const subtotal = cart.reduce((sum, item) => sum + getItemTotal(item), 0);
  const tax = Math.round(subtotal * 0.11); // 11% tax
  const total = subtotal + tax;

  return (
    <div className={clsx('fixed inset-0 z-50', open ? 'block' : 'hidden')}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Keranjang Belanja</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <ShoppingCart className="h-16 w-16 text-gray-400" />
            <p className="mt-4 text-gray-600">Keranjang kosong</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.map((item) => (
                <CartItem
                  key={`${item.productId}-${item.variantId || ''}`}
                  item={item}
                  itemTotal={getItemTotal(item)}
                  onUpdateQuantity={(delta) => updateQuantity(item.productId, item.variantId, delta)}
                  onRemove={() => removeItem(item.productId, item.variantId)}
                />
              ))}
            </div>

            <div className="border-t p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pajak (11%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                *Ongkir akan dihitung di checkout
              </p>
            </div>

            <div className="p-4">
              <Button onClick={onCheckout} className="w-full" size="lg">
                Checkout
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
