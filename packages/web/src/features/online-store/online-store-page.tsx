import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Store, Plus, ExternalLink, Globe, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth.store';
import { onlineStoreApi } from '@/api/endpoints/online-store.api';
import type { OnlineStore } from '@/types/online-store.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function StoreCard({ store }: { store: OnlineStore }) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const storeUrl = `${baseUrl}/online-store/s/${store.slug}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{store.name}</CardTitle>
              <p className="text-xs text-muted-foreground">/{store.slug}</p>
            </div>
          </div>
          <Badge className={store.isActive ? 'bg-green-500 hover:bg-green-600' : ''}>
            {store.isActive ? 'Aktif' : 'Nonaktif'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {store.description && (
          <p className="mb-4 text-sm text-muted-foreground">{store.description}</p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => window.open(storeUrl, '_blank')}
        >
          <ExternalLink className="h-4 w-4" />
          Lihat Toko
        </Button>
      </CardContent>
    </Card>
  );
}

function LoadingCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-4 h-4 w-full" />
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function OnlineStorePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const businessId = user?.businessId || '';

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [storeDescription, setStoreDescription] = useState('');

  const {
    data: stores,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['online-stores'],
    queryFn: () => onlineStoreApi.getStores(),
  });

  const createMutation = useMutation({
    mutationFn: onlineStoreApi.createStore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-stores'] });
      toast({ title: 'Toko berhasil dibuat' });
      closeDialog();
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal membuat toko',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  function openDialog() {
    setStoreName('');
    setStoreSlug('');
    setStoreDescription('');
    setCreateDialogOpen(true);
  }

  function closeDialog() {
    setCreateDialogOpen(false);
    setStoreName('');
    setStoreSlug('');
    setStoreDescription('');
  }

  function handleNameChange(value: string) {
    setStoreName(value);
    setStoreSlug(slugify(value));
  }

  function handleSubmit() {
    if (!storeName.trim() || !storeSlug.trim()) return;
    createMutation.mutate({
      businessId,
      name: storeName.trim(),
      slug: storeSlug.trim(),
      description: storeDescription.trim() || undefined,
    });
  }

  return (
    <div>
      <PageHeader title="Toko Online" description="Kelola toko online Anda">
        <Button onClick={openDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Buat Toko
        </Button>
      </PageHeader>

      {/* Loading */}
      {isLoading && <LoadingCards />}

      {/* Error */}
      {isError && (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              icon={Globe}
              title="Gagal memuat data toko"
              description="Terjadi kesalahan saat memuat data. Silakan coba lagi."
            />
          </CardContent>
        </Card>
      )}

      {/* Empty */}
      {!isLoading && !isError && stores && stores.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Store}
              title="Belum ada toko online"
              description="Buat toko online pertama Anda untuk mulai menerima pesanan secara online."
              action={
                <Button onClick={openDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Buat Toko
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Store Grid */}
      {!isLoading && !isError && stores && stores.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Toko Online</DialogTitle>
            <DialogDescription>
              Buat toko online baru untuk menerima pesanan dari pelanggan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nama Toko</Label>
              <Input
                value={storeName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Contoh: Kedai Kopi Nusantara"
              />
            </div>

            <div>
              <Label>Slug</Label>
              <Input
                value={storeSlug}
                onChange={(e) => setStoreSlug(slugify(e.target.value))}
                placeholder="kedai-kopi-nusantara"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                URL toko: /online-store/s/{storeSlug || '...'}
              </p>
            </div>

            <div>
              <Label>Deskripsi</Label>
              <Textarea
                value={storeDescription}
                onChange={(e) => setStoreDescription(e.target.value)}
                placeholder="Deskripsi singkat toko Anda"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={createMutation.isPending}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!storeName.trim() || !storeSlug.trim() || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Buat Toko
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
