import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api/endpoints/settings.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/lib/toast-utils';
import { Plus, MoreHorizontal, Pencil, Ban, Loader2 } from 'lucide-react';
import type { Outlet, CreateOutletRequest } from '@/types/settings.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

interface OutletFormData {
  name: string;
  code: string;
  address: string;
  phone: string;
  taxRate: number;
  serviceCharge: number;
}

const defaultForm: OutletFormData = {
  name: '',
  code: '',
  address: '',
  phone: '',
  taxRate: 11,
  serviceCharge: 0,
};

export function OutletsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Outlet | null>(null);
  const [form, setForm] = useState<OutletFormData>(defaultForm);

  const { data: outlets, isLoading } = useQuery({
    queryKey: ['outlets'],
    queryFn: settingsApi.listOutlets,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateOutletRequest) => settingsApi.createOutlet(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
      toast.success({ title: 'Outlet berhasil ditambahkan' });
      closeDialog();
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menambahkan outlet',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateOutletRequest> }) =>
      settingsApi.updateOutlet(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
      toast.success({ title: 'Outlet berhasil diperbarui' });
      closeDialog();
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal memperbarui outlet',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) =>
      settingsApi.updateOutlet(id, { name: undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
      toast.success({ title: 'Outlet dinonaktifkan' });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menonaktifkan outlet',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const openCreate = () => {
    setEditTarget(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (outlet: Outlet) => {
    setEditTarget(outlet);
    setForm({
      name: outlet.name,
      code: outlet.code ?? '',
      address: outlet.address ?? '',
      phone: outlet.phone ?? '',
      taxRate: outlet.taxRate,
      serviceCharge: outlet.serviceCharge,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditTarget(null);
    setForm(defaultForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CreateOutletRequest = {
      name: form.name,
      code: form.code || undefined,
      address: form.address || undefined,
      phone: form.phone || undefined,
      taxRate: form.taxRate,
      serviceCharge: form.serviceCharge,
    };

    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        openCreate();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const columns: Column<Outlet>[] = [
    {
      key: 'name',
      header: 'Nama',
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'code',
      header: 'Kode',
      cell: (row) => <span className="text-muted-foreground">{row.code ?? '-'}</span>,
    },
    {
      key: 'address',
      header: 'Alamat',
      cell: (row) => (
        <span className="text-muted-foreground">{row.address ?? '-'}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Telepon',
      cell: (row) => <span className="text-muted-foreground">{row.phone ?? '-'}</span>,
    },
    {
      key: 'taxRate',
      header: 'Pajak (%)',
      cell: (row) => `${row.taxRate}%`,
    },
    {
      key: 'serviceCharge',
      header: 'Service Charge (%)',
      cell: (row) => `${row.serviceCharge}%`,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) =>
        row.isActive ? (
          <Badge variant="default">Aktif</Badge>
        ) : (
          <Badge variant="outline">Nonaktif</Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Aksi outlet">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            {row.isActive && (
              <DropdownMenuItem
                onClick={() => deactivateMutation.mutate(row.id)}
                className="text-destructive"
              >
                <Ban className="mr-2 h-4 w-4" /> Nonaktifkan
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Kelola Outlet" description="Daftar outlet bisnis Anda">
        <Button onClick={openCreate} aria-keyshortcuts="N">
          <Plus className="mr-2 h-4 w-4" /> Tambah Outlet
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={outlets ?? []}
        isLoading={isLoading}
        emptyTitle="Belum ada outlet"
        emptyDescription="Tambahkan outlet pertama Anda."
      />

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Outlet' : 'Tambah Outlet'}</DialogTitle>
            <DialogDescription>
              {editTarget
                ? 'Perbarui informasi outlet.'
                : 'Isi data untuk menambahkan outlet baru.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="outlet-name">Nama</Label>
              <Input
                id="outlet-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nama outlet"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="outlet-code">Kode</Label>
              <Input
                id="outlet-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="Kode outlet (opsional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="outlet-address">Alamat</Label>
              <Textarea
                id="outlet-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Alamat outlet (opsional)"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="outlet-phone">Telepon</Label>
              <Input
                id="outlet-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Nomor telepon (opsional)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="outlet-tax">Tarif Pajak (%)</Label>
                <Input
                  id="outlet-tax"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={form.taxRate}
                  onChange={(e) => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="outlet-service">Service Charge (%)</Label>
                <Input
                  id="outlet-service"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={form.serviceCharge}
                  onChange={(e) =>
                    setForm({ ...form, serviceCharge: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={isSaving}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                aria-busy={isSaving}
                aria-label={isSaving ? (editTarget ? 'Saving outlet...' : 'Adding outlet...') : undefined}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editTarget ? 'Simpan' : 'Tambah'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
