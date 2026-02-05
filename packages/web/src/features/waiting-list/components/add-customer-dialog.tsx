import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { waitingListApi } from '@/api/endpoints/waiting-list.api';
import { useUIStore } from '@/stores/ui.store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/toast-utils';
import { Loader2, UserPlus } from 'lucide-react';
import type { AddWaitingListRequest } from '@/types/waiting-list.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddCustomerDialog({ open, onOpenChange, onSuccess }: AddCustomerDialogProps) {
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const [formData, setFormData] = useState<AddWaitingListRequest>({
    customerName: '',
    phoneNumber: '',
    partySize: 2,
    specialRequests: '',
  });

  const createMutation = useMutation({
    mutationFn: (data: AddWaitingListRequest) => waitingListApi.create(data),
    onSuccess: (data) => {
      toast.success({
        title: 'Pelanggan ditambahkan',
        description: `${data.customerName} telah ditambahkan ke daftar tunggu`,
      });
      // Reset form
      setFormData({
        customerName: '',
        phoneNumber: '',
        partySize: 2,
        specialRequests: '',
      });
      onSuccess();
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menambahkan pelanggan',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.customerName.trim()) {
      toast.error({ title: 'Validasi gagal', description: 'Nama pelanggan wajib diisi' });
      return;
    }

    if (!formData.phoneNumber.trim()) {
      toast.error({ title: 'Validasi gagal', description: 'Nomor telepon wajib diisi' });
      return;
    }

    if (formData.partySize < 1 || formData.partySize > 50) {
      toast.error({ title: 'Validasi gagal', description: 'Jumlah orang harus antara 1-50' });
      return;
    }

    if (!selectedOutletId) {
      toast.error({ title: 'Error', description: 'Outlet tidak dipilih' });
      return;
    }

    createMutation.mutate(formData);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !createMutation.isPending) {
      // Reset form when closing
      setFormData({
        customerName: '',
        phoneNumber: '',
        partySize: 2,
        specialRequests: '',
      });
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Tambah Pelanggan ke Daftar Tunggu
          </DialogTitle>
          <DialogDescription>
            Masukkan data pelanggan yang ingin ditambahkan ke antrian
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">
                Nama Pelanggan <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customerName"
                placeholder="Masukkan nama pelanggan"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                disabled={createMutation.isPending}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">
                Nomor Telepon <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="08xxxxxxxxxx"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                disabled={createMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partySize">
                Jumlah Orang <span className="text-destructive">*</span>
              </Label>
              <Input
                id="partySize"
                type="number"
                min="1"
                max="50"
                value={formData.partySize}
                onChange={(e) => setFormData({ ...formData, partySize: parseInt(e.target.value) || 1 })}
                disabled={createMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Berapa banyak orang dalam grup ini?
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialRequests">Catatan Khusus (Opsional)</Label>
              <Textarea
                id="specialRequests"
                placeholder="Contoh: Butuh kursi bayi, area non-smoking..."
                value={formData.specialRequests}
                onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                disabled={createMutation.isPending}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tambahkan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
