import { useState } from 'react';
import { Store, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NumPad } from './numpad';
import { shiftsApi } from '@/api/endpoints/shifts.api';
import { useAuthStore } from '@/stores/auth.store';
import { formatCurrency } from '@/lib/format';
import { toast } from '@/lib/toast-utils';

const QUICK_AMOUNTS = [100000, 200000, 500000, 1000000];

interface ShiftStartModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  outletId: string;
}

export function ShiftStartModal({
  open,
  onClose,
  onSuccess,
  outletId,
}: ShiftStartModalProps) {
  const user = useAuthStore((state) => state.user);
  const [openingCash, setOpeningCash] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    setOpeningCash(parseInt(newValue) || 0);
  };

  const handleQuickAmount = (amount: number) => {
    setInputValue(amount.toString());
    setOpeningCash(amount);
  };

  const handleSubmit = async () => {
    if (openingCash <= 0) {
      toast.error({
        title: 'Kas Awal Required',
        description: 'Silakan masukkan kas awal untuk memulai shift',
      });
      return;
    }

    if (!user?.employeeId) {
      toast.error({
        title: 'Error',
        description: 'Informasi karyawan tidak ditemukan',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await shiftsApi.start(user.employeeId, {
        outletId,
        openingCash,
      });

      toast.success({
        title: 'Shift Berhasil Dimulai',
        description: `Kas awal: ${formatCurrency(openingCash)}`,
      });

      // Reset state
      setInputValue('');
      setOpeningCash(0);

      onSuccess();
    } catch (error) {
      console.error('Failed to start shift:', error);
      toast.error({
        title: 'Gagal Memulai Shift',
        description: 'Terjadi kesalahan saat memulai shift. Silakan coba lagi.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const greeting = getGreeting();

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm p-4" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="pb-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
              <Store className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">Mulai Shift</DialogTitle>
              <DialogDescription className="text-xs">
                {greeting}, {user?.name || 'Kasir'} {user?.outletName ? `\u2022 ${user.outletName}` : ''}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* Opening Cash Display */}
          <div className="bg-muted/30 rounded-lg p-2.5 border border-muted-foreground/15">
            <p className="text-xs text-muted-foreground text-center mb-0.5">Kas Awal</p>
            <p className="text-2xl font-bold tabular-nums text-center">
              {formatCurrency(openingCash)}
            </p>
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            {QUICK_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                variant={openingCash === amount ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickAmount(amount)}
                disabled={isSubmitting}
                className="h-8 text-xs font-medium"
              >
                {(amount / 1000).toLocaleString('id-ID')}rb
              </Button>
            ))}
          </div>

          {/* Compact Numpad */}
          <NumPad
            value={inputValue}
            onChange={handleInputChange}
            className="gap-1.5 [&_button]:h-10 [&_button]:text-base"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            size="sm"
            className="flex-1 h-9"
            onClick={handleSubmit}
            disabled={openingCash <= 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Memproses...
              </>
            ) : (
              'Mulai Shift'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour >= 4 && hour < 10) {
    return 'Selamat pagi';
  }
  if (hour >= 10 && hour < 15) {
    return 'Selamat siang';
  }
  if (hour >= 15 && hour < 18) {
    return 'Selamat sore';
  }
  return 'Selamat malam';
}
