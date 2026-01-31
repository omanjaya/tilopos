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
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Check, X, Loader2 } from 'lucide-react';
import type { Category } from '@/types/product.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryManager({ open, onOpenChange }: CategoryManagerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: () => categoriesApi.create({ name: newName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setNewName('');
      toast({ title: 'Kategori ditambahkan' });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({ variant: 'destructive', title: 'Gagal', description: error.response?.data?.message || 'Terjadi kesalahan' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      categoriesApi.update(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditingId(null);
      toast({ title: 'Kategori diperbarui' });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({ variant: 'destructive', title: 'Gagal', description: error.response?.data?.message || 'Terjadi kesalahan' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (cat: Category) =>
      categoriesApi.update(cat.id, { isActive: !cat.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
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
          <Button type="submit" size="sm" disabled={createMutation.isPending || !newName.trim()}>
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>

        <div className="mt-4 space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
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
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
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
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(cat)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant={cat.isActive ? 'outline' : 'default'}
                        className="h-7 text-xs"
                        onClick={() => toggleMutation.mutate(cat)}
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
      </SheetContent>
    </Sheet>
  );
}
