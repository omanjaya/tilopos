import type { DeliveryMethod } from '../types/storefront.types';
import type { StorefrontOrderResult } from '@/types/online-store.types';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';

interface OrderSuccessProps {
  order: StorefrontOrderResult;
  deliveryMethod: DeliveryMethod;
  onShopAgain: () => void;
}

/** Shows the server-confirmed order (number and totals from the checkout response). */
export function OrderSuccess({ order, deliveryMethod, onShopAgain }: OrderSuccessProps) {
  return (
    <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
          <span className="text-5xl" aria-hidden="true">✓</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Pesanan Berhasil Dibuat!</h1>
        <p className="text-muted-foreground mb-8">Terima kasih atas pesanan Anda.</p>

        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <p className="text-sm text-muted-foreground mb-2">Nomor Pesanan</p>
          <p className="text-4xl font-bold">{order.orderNumber}</p>
        </div>

        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(Number(order.subtotal))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ongkos kirim</span>
            <span>
              {deliveryMethod === 'delivery' && Number(order.shippingCost) === 0
                ? 'Dikonfirmasi oleh toko'
                : formatCurrency(Number(order.shippingCost))}
            </span>
          </div>
          <div className="flex justify-between border-t pt-2 font-bold">
            <span>Total</span>
            <span className="text-2xl text-primary">{formatCurrency(Number(order.grandTotal))}</span>
          </div>
        </div>

        <p className="mb-6 text-sm text-muted-foreground">
          Simpan nomor pesanan ini. Toko akan menghubungi Anda untuk konfirmasi pesanan.
        </p>

        <Button onClick={onShopAgain}>Belanja Lagi</Button>
      </div>
    </div>
  );
}
