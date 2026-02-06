import type { CartItem, DeliveryMethod, OrderStatus } from '../types/storefront.types';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';

interface OrderSummaryProps {
  cart: CartItem[];
  deliveryMethod: DeliveryMethod;
  orderStatus: OrderStatus;
  onSubmit: () => void;
  onBack: () => void;
}

export function OrderSummary({
  cart,
  deliveryMethod,
  orderStatus,
  onSubmit,
  onBack,
}: OrderSummaryProps) {
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = cart.reduce((sum, item) => {
    const basePrice = item.variant?.price || item.price;
    const modifiersPrice = item.modifiers?.reduce((sum, m) => sum + m.price, 0) || 0;
    return sum + (basePrice + modifiersPrice) * item.quantity;
  }, 0);

  const tax = Math.round(subtotal * 0.11);
  const shippingFee = deliveryMethod === 'delivery' ? 15000 : 0;
  const total = subtotal + tax + shippingFee;

  return (
    <>
      <h2 className="text-lg font-semibold mb-4">Konfirmasi Pesanan</h2>
      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Item</span>
          <span className="text-muted-foreground">Jumlah</span>
        </div>
        {cart.map((item) => (
          <div key={`${item.productId}-${item.variantId || ''}`} className="flex justify-between text-sm">
            <span>{item.name}</span>
            <span>x{item.quantity}</span>
          </div>
        ))}
      </div>

      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal ({cartItemCount} item)</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Pajak (11%)</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Ongkir</span>
          <span>{formatCurrency(shippingFee)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span className="text-primary">{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Kembali
        </Button>
        <Button onClick={onSubmit} disabled={orderStatus === 'submitting'} className="flex-1">
          {orderStatus === 'submitting' ? (
            'Memproses...'
          ) : (
            `Buat Pesanan - ${formatCurrency(total)}`
          )}
        </Button>
      </div>
    </>
  );
}
