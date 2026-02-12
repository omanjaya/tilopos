import type { CustomerInfo } from '../types/storefront.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CustomerInfoFormProps {
  customerInfo: CustomerInfo;
  setCustomerInfo: (info: CustomerInfo) => void;
  onNext: () => void;
  onCancel: () => void;
}

export function CustomerInfoForm({
  customerInfo,
  setCustomerInfo,
  onNext,
  onCancel,
}: CustomerInfoFormProps) {
  const isValid = customerInfo.name.trim() !== '' && customerInfo.phone.trim() !== '';

  return (
    <>
      <h2 className="text-lg font-semibold mb-4">Informasi Pelanggan</h2>
      <div className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Nama Lengkap *</label>
          <Input
            value={customerInfo.name}
            onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
            placeholder="Masukkan nama lengkap"
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Nomor HP *</label>
          <Input
            type="tel"
            value={customerInfo.phone}
            onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
            placeholder="08xx-xxxx-xxxx"
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Email</label>
          <Input
            type="email"
            value={customerInfo.email}
            onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
            placeholder="email@example.com"
          />
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Batal
        </Button>
        <Button onClick={onNext} disabled={!isValid} className="flex-1">
          Lanjut
        </Button>
      </div>
    </>
  );
}
