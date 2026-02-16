import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Banknote, QrCode, CreditCard, Building2, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

const paymentOptions = [
  { id: 'cash', label: 'Tunai', icon: Banknote, description: 'Pembayaran tunai' },
  { id: 'qris', label: 'QRIS', icon: QrCode, description: 'Scan QR code' },
  { id: 'debit', label: 'Kartu Debit', icon: CreditCard, description: 'EDC debit' },
  { id: 'credit', label: 'Kartu Kredit', icon: CreditCard, description: 'EDC kredit' },
  { id: 'transfer', label: 'Transfer Bank', icon: Building2, description: 'Transfer manual' },
  { id: 'ewallet', label: 'E-Wallet', icon: Wallet, description: 'GoPay, OVO, dll' },
];

interface PaymentStepProps {
  selectedMethods: string[];
  taxRate: number;
  onToggleMethod: (method: string) => void;
  onTaxRateChange: (rate: number) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function PaymentStep({
  selectedMethods,
  taxRate,
  onToggleMethod,
  onTaxRateChange,
  onNext,
  onBack,
  onSkip,
}: PaymentStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="py-4"
    >
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold">Metode Pembayaran</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pilih metode pembayaran yang diterima di outlet Anda.
        </p>
      </div>

      <div className="mx-auto max-w-lg space-y-6">
        {/* Payment Methods */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {paymentOptions.map((opt) => {
            const isSelected = selectedMethods.includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => onToggleMethod(opt.id)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border p-3 transition-all hover:border-primary/50',
                  isSelected && 'border-primary bg-primary/5 ring-2 ring-primary/20',
                )}
              >
                <opt.icon className={cn('h-5 w-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                <span className="text-sm font-medium">{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.description}</span>
              </button>
            );
          })}
        </div>

        {/* Tax Rate */}
        <div className="rounded-lg border p-4">
          <Label htmlFor="taxRate" className="text-sm font-medium">
            Tarif Pajak PPN (%)
          </Label>
          <div className="mt-2 flex items-center gap-3">
            <Input
              id="taxRate"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={taxRate}
              onChange={(e) => onTaxRateChange(parseFloat(e.target.value) || 0)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">
              Default 11% sesuai PPN Indonesia
            </span>
          </div>
        </div>

        {/* Include tax in price info */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            Pengaturan pajak dan metode pembayaran bisa diubah kapan saja di menu Pengaturan.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Kembali
        </Button>
        <Button onClick={onNext} disabled={selectedMethods.length === 0} className="flex-1">
          Lanjut
        </Button>
      </div>
      <div className="mx-auto mt-2 max-w-md">
        <Button variant="ghost" onClick={onSkip} className="w-full">
          Lewati langkah ini
        </Button>
      </div>
    </motion.div>
  );
}
