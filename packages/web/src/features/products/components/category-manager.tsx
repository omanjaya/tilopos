import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '@/api/endpoints/categories.api';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ErrorState } from '@/components/shared/error-state';
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
import { Plus, Pencil, Check, X, Loader2 } from 'lucide-react';
import type { Category } from '@/types/product.types';

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryManager({ open, onOpenChange }: CategoryManagerProps) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState<Category | null>(null);

  const { data: categories, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: categoriesApi.listAll,
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: () => categoriesApi.create({ name: newName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setNewName('');
      toast.success({ title: 'Kategori ditambahkan' });
    },
    onError: (error) => handleMutationError(error, 'Gagal menambah kategori'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      categoriesApi.update(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditingId(null);
      toast.success({ title: 'Kategori diperbarui' });
    },
    onError: (error) => handleMutationError(error, 'Gagal memperbarui kategori'),
  });

  const toggleMutation = useMutation({
    mutationFn: (cat: Category) =>
      categoriesApi.update(cat.id, { isActive: !cat.isActive }),
    onSuccess: (_data, cat) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeactivateTarget(null);
      toast.success({ title: cat.isActive ? 'Kategori dinonaktifkan' : 'Kategori diaktifkan' });
    },
    onError: (error) => handleMutationError(error, 'Gagal mengubah status kategori'),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate();
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const saveEdit = () => {
    if (!editingId || !editingName.trim()) return;
    updateMutation.mutate({ id: editingId, name: editingName });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Kelola Kategori</SheetTitle>
          <SheetDescription>Tambah, edit, atau nonaktifkan kategori produk.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleCreate} className="mt-6 flex gap-2">
          <Input
            placeholder="Nama kategori baru"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button
            type="submit"
            size="sm"
            disabled={createMutation.isPending || !newName.trim()}
            aria-label="Tambah kategori"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>

        <div className="mt-4 space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : isError ? (
            <ErrorState title="Gagal memuat kategori" error={error} onRetry={() => void refetch()} />
          ) : categories && categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada kategori.</p>
          ) : (
            categories?.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                {editingId === cat.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="h-8"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit} aria-label="Simpan">
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)} aria-label="Batal">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{cat.name}</span>
                      {!cat.isActive && <Badge variant="outline" className="text-xs">Nonaktif</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(cat)} aria-label="Edit kategori">
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant={cat.isActive ? 'outline' : 'default'}
                        className="h-7 text-xs"
                        onClick={() => (cat.isActive ? setDeactivateTarget(cat) : toggleMutation.mutate(cat))}
                        disabled={toggleMutation.isPending}
                      >
                        {cat.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <ConfirmDialog
          open={!!deactivateTarget}
          onOpenChange={(o) => !o && setDeactivateTarget(null)}
          title="Nonaktifkan Kategori?"
          description={`Kategori "${deactivateTarget?.name ?? ''}" akan disembunyikan dari daftar kategori dan POS.`}
          confirmLabel="Nonaktifkan"
          variant="destructive"
          isLoading={toggleMutation.isPending}
          onConfirm={() => deactivateTarget && toggleMutation.mutate(deactivateTarget)}
        />
      </SheetContent>
    </Sheet>
  );
}
