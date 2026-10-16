import { useEffect } from 'react';
import type { CustomerInfo, DeliveryMethod } from '../types/storefront.types';
import { Button } from '@/components/ui/button';
import { clsx } from 'clsx';

interface DeliveryMethodSelectProps {
  deliveryMethod: DeliveryMethod;
  setDeliveryMethod: (method: DeliveryMethod) => void;
  isDeliveryEnabled: boolean;
  isPickupEnabled: boolean;
  customerInfo: CustomerInfo;
  setCustomerInfo: (info: CustomerInfo) => void;
  onNext: () => void;
  onBack: () => void;
}

const OPTIONS: { value: DeliveryMethod; label: string; description: string }[] = [
  { value: 'delivery', label: 'Diantar', description: 'Diantar ke alamat Anda. Ongkir dikonfirmasi oleh toko.' },
  { value: 'pickup', label: 'Ambil Sendiri', description: 'Ambil sendiri di toko' },
];

export function DeliveryMethodSelect({
  deliveryMethod,
  setDeliveryMethod,
  isDeliveryEnabled,
  isPickupEnabled,
  customerInfo,
  setCustomerInfo,
  onNext,
  onBack,
}: DeliveryMethodSelectProps) {
  const options = OPTIONS.filter((o) =>
    o.value === 'delivery' ? isDeliveryEnabled : isPickupEnabled,
  );

  // Fall back to an enabled method when the current one is disabled by the store.
  useEffect(() => {
    if (options.length > 0 && !options.some((o) => o.value === deliveryMethod)) {
      setDeliveryMethod(options[0]!.value);
    }
  }, [options, deliveryMethod, setDeliveryMethod]);

  const isValid =
    options.some((o) => o.value === deliveryMethod) &&
    (deliveryMethod === 'pickup' || customerInfo.address.trim() !== '');

  return (
    <>
      <h2 className="text-lg font-semibold mb-4">Pengiriman</h2>
      <div className="space-y-4">
        <fieldset>
          <legend className="block mb-2 font-medium">Metode Pengiriman *</legend>
          {options.length === 0 ? (
            <p className="text-sm text-destructive">Toko ini belum mengaktifkan metode pengiriman.</p>
          ) : (
            <div className="space-y-3">
              {options.map((option) => (
                <label
                  key={option.value}
                  className={clsx(
                    'flex items-center space-x-2 border p-3 rounded cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-ring',
                    deliveryMethod === option.value ? 'border-primary bg-primary/5' : ''
                  )}
                >
                  <input
                    type="radio"
                    name="delivery"
                    checked={deliveryMethod === option.value}
                    onChange={() => setDeliveryMethod(option.value)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {deliveryMethod === 'delivery' && (
          <div>
            <label htmlFor="checkout-address" className="block mb-1 font-medium">
              Alamat Pengiriman *
            </label>
            <textarea
              id="checkout-address"
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
          <label htmlFor="checkout-notes" className="block mb-1 font-medium">
            Catatan Pesanan (opsional)
          </label>
          <textarea
            id="checkout-notes"
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
