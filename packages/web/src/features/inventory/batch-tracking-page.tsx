import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { batchTrackingApi } from '@/api/endpoints/batch-tracking.api';
import { productsApi } from '@/api/endpoints/products.api';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { hasRole } from '@/config/permissions';
import { ErrorState } from '@/components/shared/error-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { handleMutationError } from '@/lib/api-error-handler';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/lib/toast-utils';
import {
  AlertTriangle, Calendar, Package, Plus, Trash2,
} from 'lucide-react';

function formatDate(date: string | null) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return <Badge variant="secondary">Tanpa kadaluarsa</Badge>;
  const expiry = new Date(expiresAt);
  const now = new Date();
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return <Badge variant="destructive">Kadaluarsa</Badge>;
  if (daysLeft <= 7) return <Badge variant="destructive">Kadaluarsa {daysLeft} hari lagi</Badge>;
  if (daysLeft <= 30) return <Badge className="bg-amber-500">Kadaluarsa {daysLeft} hari lagi</Badge>;
  return <Badge variant="secondary">Kadaluarsa: {formatDate(expiresAt)}</Badge>;
}

export function BatchTrackingPage() {
  const queryClient = useQueryClient();
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const userOutletId = useAuthStore((s) => s.user?.outletId);
  // DELETE /batch-tracking/:id is @Roles(OWNER, MANAGER); create is also open to inventory.
  const canDelete = hasRole(useAuthStore((s) => s.user?.role), 'MANAGEMENT');
  const outletId = selectedOutletId || userOutletId || '';
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'expiring' | 'expired' | 'add'>('expiring');
  const [daysFilter, setDaysFilter] = useState(7);

  // Form state
  const [productId, setProductId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');

  const {
    data: expiringData,
    isLoading: expiringLoading,
    isError: expiringIsError,
    error: expiringError,
    refetch: refetchExpiring,
  } = useQuery({
    queryKey: ['batch-expiring', outletId, daysFilter],
    queryFn: () => batchTrackingApi.getExpiring(outletId, daysFilter),
    enabled: !!outletId && activeTab === 'expiring',
  });

  const {
    data: expiredBatches,
    isLoading: expiredLoading,
    isError: expiredIsError,
    error: expiredError,
    refetch: refetchExpired,
  } = useQuery({
    queryKey: ['batch-expired', outletId],
    queryFn: () => batchTrackingApi.getExpired(outletId),
    enabled: !!outletId && activeTab === 'expired',
  });

  const {
    data: products,
    isError: productsIsError,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['products-for-batch'],
    queryFn: () => productsApi.list(),
    enabled: activeTab === 'add',
  });

  const createMutation = useMutation({
    mutationFn: () =>
      batchTrackingApi.create({
        productId,
        outletId,
        batchNumber,
        quantity: parseFloat(quantity),
        costPrice: costPrice ? parseFloat(costPrice) : undefined,
        expiresAt: expiresAt || undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-expiring'] });
      toast.success({ title: 'Batch lot berhasil ditambahkan' });
      setBatchNumber('');
      setQuantity('');
      setCostPrice('');
      setExpiresAt('');
      setNotes('');
    },
    onError: (err) => handleMutationError(err, 'Gagal menambahkan batch'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => batchTrackingApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-expiring'] });
      queryClient.invalidateQueries({ queryKey: ['batch-expired'] });
      toast.success({ title: 'Batch dihapus' });
      setDeleteId(null);
    },
    onError: (err) => handleMutationError(err, 'Gagal menghapus batch'),
  });

  if (!outletId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pelacakan Batch & Kadaluarsa" />
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
            Pilih outlet terlebih dahulu melalui pemilih outlet
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pelacakan Batch & Kadaluarsa"
        description="Kelola batch produk dan pantau tanggal kadaluarsa"
      />

      <div className="flex gap-2">
        {(['expiring', 'expired', 'add'] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'expiring' && <AlertTriangle className="mr-1 h-4 w-4" />}
            {tab === 'expired' && <Calendar className="mr-1 h-4 w-4" />}
            {tab === 'add' && <Plus className="mr-1 h-4 w-4" />}
            {tab === 'expiring' ? 'Hampir Kadaluarsa' : tab === 'expired' ? 'Sudah Kadaluarsa' : 'Tambah Batch'}
          </Button>
        ))}
      </div>

      {activeTab === 'expiring' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Produk Hampir Kadaluarsa</CardTitle>
                <CardDescription>{expiringData?.batches.length ?? 0} batch dalam {daysFilter} hari ke depan</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Hari:</Label>
                <Input
                  type="number"
                  value={daysFilter}
                  onChange={(e) => setDaysFilter(parseInt(e.target.value, 10) || 7)}
                  className="h-8 w-20"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {expiringLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : expiringIsError ? (
              <ErrorState error={expiringError} onRetry={() => refetchExpiring()} />
            ) : (expiringData?.batches ?? []).length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Tidak ada produk yang hampir kadaluarsa</p>
            ) : (
              <div className="space-y-2">
                {(expiringData?.batches ?? []).map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{batch.product?.name ?? 'Produk tidak dikenal'}</p>
                        <p className="text-xs text-muted-foreground">
                          Batch: {batch.batchNumber} | Qty: {batch.quantity}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ExpiryBadge expiresAt={batch.expiresAt} />
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDeleteId(batch.id)}
                          aria-label={`Hapus batch ${batch.batchNumber}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'expired' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produk Kadaluarsa</CardTitle>
            <CardDescription>{expiredBatches?.length ?? 0} batch sudah kadaluarsa</CardDescription>
          </CardHeader>
          <CardContent>
            {expiredLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : expiredIsError ? (
              <ErrorState error={expiredError} onRetry={() => refetchExpired()} />
            ) : (expiredBatches ?? []).length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Tidak ada produk kadaluarsa</p>
            ) : (
              <div className="space-y-2">
                {(expiredBatches ?? []).map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <div>
                        <p className="text-sm font-medium">{batch.product?.name ?? 'Produk tidak dikenal'}</p>
                        <p className="text-xs text-muted-foreground">
                          Batch: {batch.batchNumber} | Qty: {batch.quantity} | Kadaluarsa: {formatDate(batch.expiresAt)}
                        </p>
                      </div>
                    </div>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeleteId(batch.id)}
                        aria-label={`Hapus batch ${batch.batchNumber}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'add' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tambah Batch Baru</CardTitle>
            <CardDescription>Catat batch produk baru yang masuk</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {productsIsError && (
              <ErrorState error={productsError} onRetry={() => refetchProducts()} />
            )}
            <div>
              <Label htmlFor="batch-product">Produk</Label>
              <select
                id="batch-product"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Pilih produk...</option>
                {(products ?? []).map((p: { id: string; name: string }) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nomor Batch</Label>
                <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="BATCH-2026-001" />
              </div>
              <div>
                <Label>Jumlah</Label>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="100" />
              </div>
              <div>
                <Label>Harga Beli (opsional)</Label>
                <Input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="50000" />
              </div>
              <div>
                <Label>Tanggal Kadaluarsa</Label>
                <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Catatan (opsional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan..." />
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!productId || !batchNumber || !quantity || createMutation.isPending}
            >
              <Plus className="mr-1 h-4 w-4" /> Simpan Batch
            </Button>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Hapus batch?"
        description="Data batch ini akan dihapus permanen."
        confirmLabel="Hapus"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
