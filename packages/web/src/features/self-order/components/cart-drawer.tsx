import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/format';
import { AlertCircle, Check, Loader2, Plus, RefreshCw, ShoppingCart, X } from 'lucide-react';
import type { CartItem } from '../hooks/use-cart';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  cartTotal: number;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onSubmitOrder: () => void;
  isSubmitting: boolean;
  isError: boolean;
  isOnline: boolean;
}

/**
 * Shopping cart drawer component
 * Displays cart items, total, and submit order button
 */
export function CartDrawer({
  open,
  onClose,
  cart,
  cartTotal,
  onUpdateQuantity,
  onRemoveItem,
  onSubmitOrder,
  isSubmitting,
  isError,
  isOnline,
}: CartDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Keranjang Belanja</span>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Tutup keranjang">
              <X className="h-5 w-5" />
            </Button>
          </DialogTitle>
          <DialogDescription className="sr-only">Daftar item di keranjang belanja</DialogDescription>
        </DialogHeader>

        {cart.length === 0 ? (
          <div className="py-12 text-center">
            <ShoppingCart className="mx-auto h-16 w-16 text-gray-400" />
            <p className="mt-4 text-gray-600">Keranjang Anda kosong</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cart Items */}
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.productId} className="flex gap-3 rounded-lg border p-3">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-16 w-16 rounded object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">{formatCurrency(item.price)}</p>
                    {item.notes && (
                      <p className="mt-1 text-xs text-gray-500">Catatan: {item.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onRemoveItem(item.productId)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 min-h-[44px]"
                        onClick={() => onUpdateQuantity(item.productId, -1)}
                      >
                        <Plus className="h-4 w-4 rotate-45" />
                      </Button>
                      <span className="w-9 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 min-h-[44px]"
                        onClick={() => onUpdateQuantity(item.productId, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={onSubmitOrder}
              disabled={isSubmitting || !isOnline}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Memproses...
                </>
              ) : !isOnline ? (
                <>
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Menunggu Koneksi...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Kirim Pesanan
                </>
              )}
            </Button>

            {/* Error Alert */}
            {isError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Gagal mengirim pesanan. Silakan coba lagi.</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
