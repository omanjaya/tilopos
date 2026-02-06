import type { CustomerInfo, DeliveryMethod } from '../types/storefront.types';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import { clsx } from 'clsx';

interface DeliveryMethodSelectProps {
  deliveryMethod: DeliveryMethod;
  setDeliveryMethod: (method: DeliveryMethod) => void;
  customerInfo: CustomerInfo;
  setCustomerInfo: (info: CustomerInfo) => void;
  onNext: () => void;
  onBack: () => void;
}

export function DeliveryMethodSelect({
  deliveryMethod,
  setDeliveryMethod,
  customerInfo,
  setCustomerInfo,
  onNext,
  onBack,
}: DeliveryMethodSelectProps) {
  const isValid = deliveryMethod === 'pickup' || customerInfo.address.trim() !== '';

  return (
    <>
      <h2 className="text-lg font-semibold mb-4">Pengiriman</h2>
      <div className="space-y-4">
        <div>
          <label className="block mb-2 font-medium">Metode Pengiriman *</label>
          <div className="space-y-3">
            <label
              className={clsx(
                'flex items-center space-x-2 border p-3 rounded cursor-pointer hover:bg-gray-50',
                deliveryMethod === 'delivery' ? 'border-primary bg-primary/5' : ''
              )}
            >
              <input
                type="radio"
                name="delivery"
                checked={deliveryMethod === 'delivery'}
                onChange={() => setDeliveryMethod('delivery')}
                className="sr-only"
              />
              <div className="flex-1">
                <p className="font-medium">Delivery</p>
                <p className="text-sm text-muted-foreground">
                  Diantar ke alamat Anda
                </p>
              </div>
              <p className="font-semibold">{formatCurrency(15000)}</p>
            </label>
            <label
              className={clsx(
                'flex items-center space-x-2 border p-3 rounded cursor-pointer hover:bg-gray-50',
                deliveryMethod === 'pickup' ? 'border-primary bg-primary/5' : ''
              )}
            >
              <input
                type="radio"
                name="delivery"
                checked={deliveryMethod === 'pickup'}
                onChange={() => setDeliveryMethod('pickup')}
                className="sr-only"
              />
              <div className="flex-1">
                <p className="font-medium">Pickup</p>
                <p className="text-sm text-muted-foreground">
                  Ambil sendiri di toko
                </p>
              </div>
              <p className="font-semibold text-green-600">Gratis</p>
            </label>
          </div>
        </div>

        {deliveryMethod === 'delivery' && (
          <div>
            <label className="block mb-1 font-medium">Alamat Pengiriman *</label>
            <textarea
              value={customerInfo.address}
              onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
              placeholder="Jl. Contoh No. 123, RT/RW, Kelurahan, Kecamatan, Kota"
              rows={3}
              className="w-full border rounded-md p-2"
              required
            />
          </div>
        )}

        <div>
          <label className="block mb-1 font-medium">Catatan Pesanan (opsional)</label>
          <textarea
            value={customerInfo.notes}
            onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
            placeholder="Contoh: Jangan gunakan cabai"
            rows={2}
            className="w-full border rounded-md p-2"
          />
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Kembali
        </Button>
        <Button onClick={onNext} disabled={!isValid} className="flex-1">
          Lanjut
        </Button>
      </div>
    </>
  );
}
