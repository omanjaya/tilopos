import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api/endpoints/settings.api';
import { templatesApi, type TemplateSummary } from '@/api/endpoints/templates.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { cn } from '@/lib/utils';
import {
  Plus, MoreHorizontal, Pencil, Ban, Loader2,
  UtensilsCrossed, Coffee, Flame, ShoppingBasket, Shirt, Hammer,
  Smartphone, Scissors, WashingMachine, Wrench, Warehouse,
} from 'lucide-react';
import type { Outlet, CreateOutletRequest } from '@/types/settings.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

const iconMap: Record<string, React.ElementType> = {
  UtensilsCrossed, Coffee, Flame, ShoppingBasket, Shirt, Hammer,
  Smartphone, Scissors, WashingMachine, Wrench, Warehouse,
};

interface OutletFormData {
  name: string;
  code: string;
  address: string;
  phone: string;
  taxRate: number;
  serviceCharge: number;
  templateType: string | null;
  applyTemplate: boolean;
}

const defaultForm: OutletFormData = {
  name: '',
  code: '',
  address: '',
  phone: '',
  taxRate: 11,
  serviceCharge: 0,
  templateType: null,
  applyTemplate: true,
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

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.list(),
  });

  const applyTemplateMutation = useMutation({
    mutationFn: (params: { outletId: string; typeCode: string }) =>
      templatesApi.apply({
        outletId: params.outletId,
        typeCode: params.typeCode,
        sections: { categories: true, products: true, modifiers: true, tables: true, units: true },
      }),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateOutletRequest) => settingsApi.createOutlet(data),
    onSuccess: async (newOutlet) => {
      // Apply template if selected
      if (form.applyTemplate && form.templateType && newOutlet?.id) {
        try {
          const result = await applyTemplateMutation.mutateAsync({
            outletId: newOutlet.id,
            typeCode: form.templateType,
          });
          toast.success({
            title: 'Outlet berhasil ditambahkan',
            description: `Template diterapkan: ${result.categories} kategori, ${result.products} produk.`,
          });
        } catch {
          toast.success({
            title: 'Outlet berhasil ditambahkan',
            description: 'Namun template gagal diterapkan. Anda bisa apply template nanti.',
          });
        }
      } else {
        toast.success({ title: 'Outlet berhasil ditambahkan' });
      }
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
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
      templateType: null,
      applyTemplate: false,
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

  const isSaving = createMutation.isPending || updateMutation.isPending || applyTemplateMutation.isPending;

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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
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

            {/* Template Selection - only for new outlets */}
            {!editTarget && templates && templates.length > 0 && (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="apply-template"
                    checked={form.applyTemplate}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, applyTemplate: !!checked, templateType: checked ? form.templateType : null })
                    }
                  />
                  <Label htmlFor="apply-template" className="text-sm font-medium">
                    Terapkan template bisnis
                  </Label>
                </div>

                {form.applyTemplate && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {templates.map((t: TemplateSummary) => {
                      const Icon = iconMap[t.icon] || ShoppingBasket;
                      const isSelected = form.templateType === t.type;
                      return (
                        <button
                          key={t.type}
                          type="button"
                          onClick={() => setForm({ ...form, templateType: t.type })}
                          className={cn(
                            'flex flex-col items-center gap-1 rounded-md border p-2 text-center transition-all hover:border-primary/50',
                            isSelected && 'border-primary bg-primary/5 ring-2 ring-primary/20',
                          )}
                        >
                          <Icon className={cn('h-4 w-4', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                          <span className="text-xs font-medium">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {form.applyTemplate && form.templateType && (
                  <p className="text-xs text-muted-foreground">
                    Kategori, produk, modifier, dan meja dari template akan ditambahkan ke outlet baru ini.
                  </p>
                )}
              </div>
            )}

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
