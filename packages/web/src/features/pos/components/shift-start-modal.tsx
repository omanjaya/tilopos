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
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Mulai Shift Kerja</DialogTitle>
            </div>
          </div>
          <DialogDescription>
            {greeting}, {user?.name || 'Kasir'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Outlet Info */}
          {user?.outletName && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Outlet</span>
              <span className="font-medium">{user.outletName}</span>
            </div>
          )}

          {/* Opening Cash Display */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Kas Awal</label>
            <div className="bg-muted/30 rounded-lg p-4 border-2 border-dashed border-muted-foreground/20">
              <p className="text-3xl font-bold tabular-nums text-center">
                {formatCurrency(openingCash)}
              </p>
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Jumlah Cepat</label>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  variant={openingCash === amount ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickAmount(amount)}
                  disabled={isSubmitting}
                  className="h-9 text-sm font-medium"
                >
                  {formatCurrency(amount).replace('Rp ', '')}
                </Button>
              ))}
            </div>
          </div>

          {/* Numpad */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Input Manual</label>
            <NumPad
              value={inputValue}
              onChange={handleInputChange}
              onSubmit={handleSubmit}
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            className="flex-1 h-10"
            onClick={handleSubmit}
            disabled={openingCash <= 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
