import type { CustomerInfo, DeliveryMethod } from '../types/storefront.types';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';

interface OrderSuccessProps {
  orderNumber: string;
  cartTotal: number;
  deliveryMethod: DeliveryMethod;
  customerInfo: CustomerInfo;
  slug: string;
  onShopAgain: () => void;
  onBackToStore: () => void;
}

export function OrderSuccess({
  orderNumber,
  cartTotal,
  deliveryMethod,
  customerInfo,
  onShopAgain,
  onBackToStore,
}: OrderSuccessProps) {
  const tax = Math.round(cartTotal * 0.11);
  const shippingFee = deliveryMethod === 'delivery' ? 15000 : 0;
  const total = cartTotal + tax + shippingFee;

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
          <span className="text-5xl">✓</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Pesanan Berhasil!</h1>
        <p className="text-muted-foreground mb-8">Terima kasih atas pesanan Anda.</p>

        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <p className="text-sm text-muted-foreground mb-2">Nomor Pesanan</p>
          <p className="text-4xl font-bold">{orderNumber}</p>
        </div>

        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <div className="grid grid-cols-2 gap-4 text-left">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(total)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Estimasi</p>
              <p className="text-2xl font-bold">
                {deliveryMethod === 'delivery' ? '45-60 menit' : '20 menit'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onShopAgain}>
            Belanja Lagi
          </Button>
          <Button onClick={onBackToStore}>
            Kembali ke Toko
          </Button>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            Notifikasi status pesanan akan dikirim via WhatsApp ke <strong>{customerInfo.phone}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
