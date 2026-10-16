import type { CartItem, DeliveryMethod, OrderStatus } from '../types/storefront.types';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface OrderSummaryProps {
  cart: CartItem[];
  deliveryMethod: DeliveryMethod;
  orderStatus: OrderStatus;
  errorMessage: string | null;
  onSubmit: () => void;
  onBack: () => void;
}

/**
 * Order review. Shows only the items subtotal: the server prices the order
 * (no tax is added by the storefront; delivery cost is confirmed by the store).
 */
export function OrderSummary({
  cart,
  deliveryMethod,
  orderStatus,
  errorMessage,
  onSubmit,
  onBack,
}: OrderSummaryProps) {
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <>
      <h2 className="text-lg font-semibold mb-4">Konfirmasi Pesanan</h2>
      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Item</span>
          <span className="text-muted-foreground">Jumlah</span>
        </div>
        {cart.map((item) => (
          <div key={item.lineId} className="flex justify-between text-sm">
            <span>
              {item.name}
              {item.variantName && <span className="text-muted-foreground"> ({item.variantName})</span>}
            </span>
            <span>x{item.quantity}</span>
          </div>
        ))}
      </div>

      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between font-bold text-lg">
          <span>Subtotal ({cartItemCount} item)</span>
          <span className="text-primary">{formatCurrency(subtotal)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {deliveryMethod === 'delivery'
            ? 'Ongkos kirim (jika ada) akan dikonfirmasi oleh toko.'
            : 'Pesanan diambil sendiri di toko.'}
        </p>
      </div>

      {orderStatus === 'error' && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage ?? 'Pesanan gagal dibuat. Silakan coba lagi.'}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack} className="flex-1" disabled={orderStatus === 'submitting'}>
          Kembali
        </Button>
        <Button onClick={onSubmit} disabled={orderStatus === 'submitting'} className="flex-1">
          {orderStatus === 'submitting' ? 'Memproses...' : 'Buat Pesanan'}
        </Button>
      </div>
    </>
  );
}
