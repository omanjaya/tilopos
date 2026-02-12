import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '@/api/endpoints/inventory.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
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
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { Plus, MoreHorizontal, Pencil, Trash2, Loader2, BarChart3, AlertCircle, Eye } from 'lucide-react';
import { SupplierDetailModal } from './components/supplier-detail-modal';
import { SupplierComparisonModal } from './components/supplier-comparison-modal';
import { ReorderAlertsModal } from './components/reorder-alerts-modal';
import type { Supplier, CreateSupplierRequest } from '@/types/inventory.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

const EMPTY_FORM: CreateSupplierRequest = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
};

export function SuppliersPage() {
  const queryClient = useQueryClient();
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const user = useAuthStore((s) => s.user);
  const outletId = selectedOutletId ?? user?.outletId ?? '';
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [form, setForm] = useState<CreateSupplierRequest>(EMPTY_FORM);
  const [detailTarget, setDetailTarget] = useState<Supplier | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [reorderAlertsOpen, setReorderAlertsOpen] = useState(false);

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers', outletId, search],
    queryFn: () => inventoryApi.listSuppliers({ outletId: outletId || undefined, search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: inventoryApi.createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success({ title: 'Supplier berhasil ditambahkan' });
      closeDialog();
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menambahkan supplier',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateSupplierRequest> }) =>
      inventoryApi.updateSupplier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success({ title: 'Supplier berhasil diperbarui' });
      closeDialog();
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal memperbarui supplier',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success({ title: 'Supplier berhasil dihapus' });
      setDeleteTarget(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menghapus supplier',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  function openCreateDialog() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(supplier: Supplier) {
    setEditTarget(supplier);
    setForm({
      name: supplier.name,
      contactName: supplier.contactName || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditTarget(null);
    setForm(EMPTY_FORM);
  }

  function handleSubmit() {
    if (!form.name) return;
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function updateForm(field: keyof CreateSupplierRequest, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        openCreateDialog();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Nama',
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'contactName',
      header: 'Kontak',
      cell: (row) => <span className="text-muted-foreground">{row.contactName || '-'}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      cell: (row) => <span className="text-muted-foreground">{row.email || '-'}</span>,
    },
    {
      key: 'phone',
      header: 'Telepon',
      cell: (row) => <span className="text-muted-foreground">{row.phone || '-'}</span>,
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
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Aksi supplier">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDetailTarget(row)}>
              <Eye className="mr-2 h-4 w-4" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEditDialog(row)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteTarget(row)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Supplier" description="Kelola data supplier">
        <Button variant="outline" onClick={() => setReorderAlertsOpen(true)}>
          <AlertCircle className="mr-2 h-4 w-4" /> Reorder Alerts
        </Button>
        <Button variant="outline" onClick={() => setComparisonOpen(true)}>
          <BarChart3 className="mr-2 h-4 w-4" /> Compare Prices
        </Button>
        <Button onClick={openCreateDialog} aria-keyshortcuts="N">
          <Plus className="mr-2 h-4 w-4" /> Tambah Supplier
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={suppliers ?? []}
        isLoading={isLoading}
        searchPlaceholder="Cari supplier..."
        onSearch={setSearch}
        emptyTitle="Belum ada supplier"
        emptyDescription="Tambahkan supplier pertama Anda."
        emptyAction={
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Supplier
          </Button>
        }
      />

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Supplier' : 'Tambah Supplier'}</DialogTitle>
            <DialogDescription>
              {editTarget ? 'Perbarui informasi supplier.' : 'Masukkan informasi supplier baru.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nama *</Label>
              <Input
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="Nama supplier"
              />
            </div>
            <div>
              <Label>Nama Kontak</Label>
              <Input
                value={form.contactName || ''}
                onChange={(e) => updateForm('contactName', e.target.value)}
                placeholder="Nama kontak"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email || ''}
                onChange={(e) => updateForm('email', e.target.value)}
                placeholder="Email supplier"
              />
            </div>
            <div>
              <Label>Telepon</Label>
              <Input
                type="tel"
                value={form.phone || ''}
                onChange={(e) => updateForm('phone', e.target.value)}
                placeholder="Nomor telepon"
              />
            </div>
            <div>
              <Label>Alamat</Label>
              <Textarea
                value={form.address || ''}
                onChange={(e) => updateForm('address', e.target.value)}
                placeholder="Alamat supplier"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.name || isSaving}
              aria-busy={isSaving}
              aria-label={isSaving ? (editTarget ? 'Saving supplier...' : 'Adding supplier...') : undefined}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editTarget ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Supplier"
        description={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}"? Supplier akan dinonaktifkan.`}
        confirmLabel="Hapus"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />

      {/* Supplier Detail Modal */}
      <SupplierDetailModal
        supplier={detailTarget}
        open={!!detailTarget}
        onOpenChange={(open) => !open && setDetailTarget(null)}
      />

      {/* Supplier Comparison Modal */}
      <SupplierComparisonModal
        open={comparisonOpen}
        onOpenChange={setComparisonOpen}
      />

      {/* Reorder Alerts Modal */}
      <ReorderAlertsModal
        open={reorderAlertsOpen}
        onOpenChange={setReorderAlertsOpen}
      />
    </div>
  );
}
