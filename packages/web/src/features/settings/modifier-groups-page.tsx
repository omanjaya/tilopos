import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api/endpoints/settings.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';
import { Plus, MoreHorizontal, Pencil, Trash2, Loader2, Save } from 'lucide-react';
import type { ModifierGroup, CreateModifierGroupRequest } from '@/types/settings.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

interface ModifierFormItem {
  name: string;
  price: number;
  isActive: boolean;
  sortOrder: number;
}

export function ModifierGroupsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ModifierGroup | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null);

  // Form state
  const [groupName, setGroupName] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [minSelections, setMinSelections] = useState(0);
  const [maxSelections, setMaxSelections] = useState(1);
  const [modifierItems, setModifierItems] = useState<ModifierFormItem[]>([]);
  const [newModName, setNewModName] = useState('');
  const [newModPrice, setNewModPrice] = useState(0);

  const { data: modifierGroups, isLoading } = useQuery({
    queryKey: ['modifierGroups', search],
    queryFn: settingsApi.listModifierGroups,
  });

  const filteredGroups = (modifierGroups ?? []).filter(
    (g) => !search || g.name.toLowerCase().includes(search.toLowerCase()),
  );

  const createMutation = useMutation({
    mutationFn: (data: CreateModifierGroupRequest) => settingsApi.createModifierGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modifierGroups'] });
      toast({ title: 'Grup modifier berhasil dibuat' });
      handleCloseDialog();
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal menyimpan',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateModifierGroupRequest> }) =>
      settingsApi.updateModifierGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modifierGroups'] });
      toast({ title: 'Grup modifier berhasil diperbarui' });
      handleCloseDialog();
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal menyimpan',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsApi.deleteModifierGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modifierGroups'] });
      toast({ title: 'Grup modifier berhasil dihapus' });
      setDeleteTarget(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal menghapus',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const resetForm = () => {
    setGroupName('');
    setIsRequired(false);
    setMinSelections(0);
    setMaxSelections(1);
    setModifierItems([]);
    setNewModName('');
    setNewModPrice(0);
    setEditingGroup(null);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (group: ModifierGroup) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setIsRequired(group.isRequired);
    setMinSelections(group.minSelections);
    setMaxSelections(group.maxSelections);
    setModifierItems(
      (group.modifiers ?? []).map((m) => ({
        name: m.name,
        price: m.price,
        isActive: m.isActive,
        sortOrder: m.sortOrder,
      })),
    );
    setDialogOpen(true);
  };

  const handleAddModifier = () => {
    if (!newModName.trim()) return;
    setModifierItems([
      ...modifierItems,
      { name: newModName.trim(), price: newModPrice, isActive: true, sortOrder: modifierItems.length },
    ]);
    setNewModName('');
    setNewModPrice(0);
  };

  const handleRemoveModifier = (index: number) => {
    setModifierItems(modifierItems.filter((_, i) => i !== index));
  };

  const handleToggleModifier = (index: number) => {
    setModifierItems(
      modifierItems.map((m, i) => (i === index ? { ...m, isActive: !m.isActive } : m)),
    );
  };

  const handleSubmitDialog = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CreateModifierGroupRequest = {
      name: groupName,
      isRequired,
      minSelections,
      maxSelections,
      modifiers: modifierItems,
    };

    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const columns: Column<ModifierGroup>[] = [
    {
      key: 'name',
      header: 'Nama Grup',
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'required',
      header: 'Wajib',
      cell: (row) =>
        row.isRequired ? (
          <Badge variant="default">Wajib</Badge>
        ) : (
          <Badge variant="outline">Opsional</Badge>
        ),
    },
    {
      key: 'selections',
      header: 'Min / Maks Pilihan',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.minSelections} / {row.maxSelections}
        </span>
      ),
    },
    {
      key: 'modifiers',
      header: 'Item Modifier',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {(row.modifiers ?? []).length} item
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Aksi grup modifier">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleOpenEdit(row)}>
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
      <PageHeader title="Modifier" description="Kelola grup modifier produk">
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Grup
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={filteredGroups}
        isLoading={isLoading}
        searchPlaceholder="Cari modifier..."
        onSearch={setSearch}
        emptyTitle="Belum ada grup modifier"
        emptyDescription="Tambahkan grup modifier pertama Anda."
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Edit Grup Modifier' : 'Tambah Grup Modifier'}</DialogTitle>
            <DialogDescription>
              {editingGroup
                ? 'Perbarui pengaturan grup modifier.'
                : 'Buat grup modifier baru untuk produk Anda.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitDialog} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Nama Grup</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Contoh: Tingkat Kepedesan"
                required
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="isRequired">Wajib Dipilih</Label>
              <Switch id="isRequired" checked={isRequired} onCheckedChange={setIsRequired} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="minSel">Min Pilihan</Label>
                <Input
                  id="minSel"
                  type="number"
                  min={0}
                  value={minSelections}
                  onChange={(e) => setMinSelections(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxSel">Maks Pilihan</Label>
                <Input
                  id="maxSel"
                  type="number"
                  min={1}
                  value={maxSelections}
                  onChange={(e) => setMaxSelections(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Item Modifier</Label>
              {modifierItems.length > 0 && (
                <div className="space-y-2">
                  {modifierItems.map((mod, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded border px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={mod.isActive}
                          onCheckedChange={() => handleToggleModifier(index)}
                        />
                        <span className="text-sm">{mod.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(mod.price)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleRemoveModifier(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Nama</Label>
                  <Input
                    value={newModName}
                    onChange={(e) => setNewModName(e.target.value)}
                    placeholder="Nama modifier"
                  />
                </div>
                <div className="w-28 space-y-1">
                  <Label className="text-xs">Harga</Label>
                  <Input
                    type="number"
                    min={0}
                    value={newModPrice}
                    onChange={(e) => setNewModPrice(parseInt(e.target.value) || 0)}
                  />
                </div>
                <Button type="button" variant="outline" size="icon" onClick={handleAddModifier} aria-label="Tambah modifier">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Batal
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {editingGroup ? 'Perbarui' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Grup Modifier"
        description={`Apakah Anda yakin ingin menghapus grup modifier "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
