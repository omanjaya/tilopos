import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api/endpoints/settings.api';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/lib/toast-utils';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Banknote,
  CreditCard,
  Smartphone,
  QrCode,
  Building2,
} from 'lucide-react';
import type { PaymentMethod, PaymentMethodType, CreatePaymentMethodRequest } from '@/types/settings.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

const TYPE_CONFIG: Record<PaymentMethodType, { label: string; icon: typeof Banknote; color: string }> = {
  cash: { label: 'Tunai', icon: Banknote, color: 'bg-success/10 text-success' },
  card: { label: 'Kartu', icon: CreditCard, color: 'bg-info/10 text-info' },
  ewallet: { label: 'E-Wallet', icon: Smartphone, color: 'bg-warning/10 text-warning' },
  qris: { label: 'QRIS', icon: QrCode, color: 'bg-primary/10 text-primary' },
  bank_transfer: { label: 'Transfer Bank', icon: Building2, color: 'bg-secondary/80 text-secondary-foreground' },
};

const EMPTY_FORM: CreatePaymentMethodRequest = {
  name: '',
  type: 'cash',
  isActive: true,
  processingFee: 0,
};

export function PaymentSettingsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreatePaymentMethodRequest>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<PaymentMethod | null>(null);

  const { data: methods, isLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: settingsApi.listPaymentMethods,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreatePaymentMethodRequest) => settingsApi.createPaymentMethod(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success({ title: 'Metode pembayaran ditambahkan' });
      closeForm();
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menambahkan',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreatePaymentMethodRequest }) =>
      settingsApi.updatePaymentMethod(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success({ title: 'Metode pembayaran diperbarui' });
      closeForm();
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal memperbarui',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsApi.deletePaymentMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success({ title: 'Metode pembayaran dinonaktifkan' });
      setDeleteConfirm(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menonaktifkan',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      settingsApi.updatePaymentMethod(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal mengubah status',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(method: PaymentMethod) {
    setEditingId(method.id);
    setForm({
      name: method.name,
      type: method.type,
      isActive: method.isActive,
      processingFee: method.processingFee,
    });
    setFormOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Group methods by type
  const grouped = (methods ?? []).reduce(
    (acc, m) => {
      (acc[m.type] ??= []).push(m);
      return acc;
    },
    {} as Record<string, PaymentMethod[]>,
  );

  const typeOrder: PaymentMethodType[] = ['cash', 'card', 'ewallet', 'qris', 'bank_transfer'];

  return (
    <div>
      <PageHeader title="Metode Pembayaran" description="Atur metode pembayaran yang tersedia di POS">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Metode
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !methods?.length ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Banknote className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">Belum ada metode pembayaran</p>
          <p className="mt-1 text-sm text-muted-foreground">Tambahkan metode pembayaran pertama Anda.</p>
          <Button onClick={openCreate} className="mt-4" size="sm">
            <Plus className="mr-2 h-4 w-4" /> Tambah Metode
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {typeOrder.map((type) => {
            const items = grouped[type];
            if (!items?.length) return null;
            const config = TYPE_CONFIG[type];
            const Icon = config.icon;
            return (
              <div key={type}>
                <div className="mb-3 flex items-center gap-2">
                  <div className={`rounded-md p-1.5 ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold">{config.label}</h3>
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((method) => (
                    <div
                      key={method.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{method.name}</span>
                          {!method.isActive && (
                            <Badge variant="secondary" className="text-xs">Nonaktif</Badge>
                          )}
                        </div>
                        {method.processingFee > 0 && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Fee: {method.processingFee}%
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={method.isActive}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({ id: method.id, isActive: checked })
                          }
                          aria-label={`Toggle ${method.name}`}
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(method)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteConfirm(method)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Perbarui detail metode pembayaran.' : 'Tambahkan metode pembayaran baru untuk POS.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="contoh: GoPay, BCA, Tunai"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipe</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as PaymentMethodType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOrder.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_CONFIG[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Processing Fee (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.processingFee ?? 0}
                onChange={(e) => setForm({ ...form, processingFee: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Biaya pemrosesan yang dikenakan per transaksi (0 = gratis).
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Batal</Button>
            <Button onClick={handleSubmit} disabled={!form.name.trim() || isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nonaktifkan Metode Pembayaran</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menonaktifkan &quot;{deleteConfirm?.name}&quot;? Metode ini tidak akan muncul di POS.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Nonaktifkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
