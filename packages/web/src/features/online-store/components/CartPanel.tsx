import type { CartItem as CartItemType } from '../types/storefront.types';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { CartItem } from './CartItem';

interface CartPanelProps {
  open: boolean;
  onClose: () => void;
  cart: CartItemType[];
  getItemTotal: (item: CartItemType) => number;
  updateQuantity: (lineId: string, delta: number) => void;
  removeItem: (lineId: string) => void;
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

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="flex w-full max-w-md flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b p-4">
          <SheetTitle>Keranjang Belanja</SheetTitle>
          <SheetDescription className="sr-only">Daftar produk di keranjang</SheetDescription>
        </SheetHeader>

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
                  key={item.lineId}
                  item={item}
                  itemTotal={getItemTotal(item)}
                  onUpdateQuantity={(delta) => updateQuantity(item.lineId, delta)}
                  onRemove={() => removeItem(item.lineId)}
                />
              ))}
            </div>

            <div className="border-t p-4 space-y-2">
              <div className="flex justify-between font-bold text-lg">
                <span>Subtotal</span>
                <span className="text-primary">{formatCurrency(subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Total akhir dihitung oleh toko saat pesanan dibuat.
              </p>
            </div>

            <div className="p-4">
              <Button onClick={onCheckout} className="w-full" size="lg">
                Lanjut ke Pembayaran
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
