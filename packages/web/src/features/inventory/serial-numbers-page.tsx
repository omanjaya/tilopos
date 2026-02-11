import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serialNumbersApi } from '@/api/endpoints/serial-numbers.api';
import { productsApi } from '@/api/endpoints/products.api';
import { useUIStore } from '@/stores/ui.store';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Hash, Search, Plus, Shield, AlertTriangle } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  in_stock: 'Stok',
  sold: 'Terjual',
  returned: 'Retur',
  warranty: 'Garansi',
  defective: 'Rusak',
};

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  in_stock: 'default',
  sold: 'secondary',
  returned: 'outline',
  warranty: 'outline',
  defective: 'destructive',
};

function formatDate(date: string | null) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function SerialNumbersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const outletId = useUIStore((s) => s.selectedOutletId) ?? '';

  const [activeTab, setActiveTab] = useState<'lookup' | 'warranty' | 'register'>('lookup');
  const [searchQuery, setSearchQuery] = useState('');
  const [lookupResult, setLookupResult] = useState<Awaited<ReturnType<typeof serialNumbersApi.lookup>> | null>(null);
  const [lookupError, setLookupError] = useState('');

  // Register form state
  const [productId, setProductId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [warrantyExpiry, setWarrantyExpiry] = useState('');
  const [regNotes, setRegNotes] = useState('');

  const { data: warrantyExpiring, isLoading: warrantyLoading } = useQuery({
    queryKey: ['serial-warranty-expiring'],
    queryFn: () => serialNumbersApi.getWarrantyExpiring(30),
    enabled: activeTab === 'warranty',
  });

  const { data: products } = useQuery({
    queryKey: ['products-for-serial'],
    queryFn: () => productsApi.list(),
    enabled: activeTab === 'register',
  });

  const lookupMutation = useMutation({
    mutationFn: (sn: string) => serialNumbersApi.lookup(sn),
    onSuccess: (data) => {
      setLookupResult(data);
      setLookupError('');
    },
    onError: () => {
      setLookupResult(null);
      setLookupError('Serial number tidak ditemukan');
    },
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      serialNumbersApi.register({
        productId,
        outletId,
        serialNumber,
        costPrice: costPrice ? parseFloat(costPrice) : undefined,
        warrantyExpiry: warrantyExpiry || undefined,
        notes: regNotes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serial'] });
      toast({ title: 'Serial number berhasil didaftarkan' });
      setSerialNumber('');
      setCostPrice('');
      setWarrantyExpiry('');
      setRegNotes('');
    },
    onError: () => toast({ variant: 'destructive', title: 'Gagal mendaftarkan serial number' }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, action, notes }: { id: string; action: string; notes?: string }) => {
      switch (action) {
        case 'sold': return serialNumbersApi.markSold(id);
        case 'returned': return serialNumbersApi.markReturned(id, notes);
        case 'warranty': return serialNumbersApi.markWarranty(id, notes);
        case 'defective': return serialNumbersApi.markDefective(id, notes);
        default: return Promise.reject('Unknown action');
      }
    },
    onSuccess: () => {
      toast({ title: 'Status diperbarui' });
      if (lookupResult) lookupMutation.mutate(lookupResult.serialNumber);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Serial Number"
        description="Tracking serial number produk elektronik"
      />

      <div className="flex gap-2">
        {(['lookup', 'warranty', 'register'] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'lookup' && <Search className="mr-1 h-4 w-4" />}
            {tab === 'warranty' && <Shield className="mr-1 h-4 w-4" />}
            {tab === 'register' && <Plus className="mr-1 h-4 w-4" />}
            {tab === 'lookup' ? 'Cari SN' : tab === 'warranty' ? 'Garansi' : 'Daftarkan'}
          </Button>
        ))}
      </div>

      {/* Lookup Tab */}
      {activeTab === 'lookup' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cari Serial Number</CardTitle>
            <CardDescription>Masukkan serial number untuk melihat detail</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Masukkan serial number..."
                onKeyDown={(e) => e.key === 'Enter' && searchQuery && lookupMutation.mutate(searchQuery)}
              />
              <Button onClick={() => lookupMutation.mutate(searchQuery)} disabled={!searchQuery || lookupMutation.isPending}>
                <Search className="mr-1 h-4 w-4" /> Cari
              </Button>
            </div>

            {lookupError && (
              <p className="text-sm text-destructive">{lookupError}</p>
            )}

            {lookupResult && (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    <span className="font-mono font-bold">{lookupResult.serialNumber}</span>
                  </div>
                  <Badge variant={STATUS_COLORS[lookupResult.status]}>{STATUS_LABELS[lookupResult.status]}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Produk:</span> {lookupResult.product?.name ?? '-'}</div>
                  <div><span className="text-muted-foreground">SKU:</span> {lookupResult.product?.sku ?? '-'}</div>
                  <div><span className="text-muted-foreground">Tgl Beli:</span> {formatDate(lookupResult.purchaseDate)}</div>
                  <div><span className="text-muted-foreground">Garansi s/d:</span> {formatDate(lookupResult.warrantyExpiry)}</div>
                  {lookupResult.customer && (
                    <div className="col-span-2"><span className="text-muted-foreground">Pelanggan:</span> {lookupResult.customer.name}</div>
                  )}
                </div>

                {/* Status actions */}
                <div className="flex gap-2 pt-2">
                  {lookupResult.status === 'in_stock' && (
                    <Button size="sm" onClick={() => statusMutation.mutate({ id: lookupResult.id, action: 'sold' })}>Tandai Terjual</Button>
                  )}
                  {lookupResult.status === 'sold' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: lookupResult.id, action: 'returned' })}>Retur</Button>
                      <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: lookupResult.id, action: 'warranty' })}>Klaim Garansi</Button>
                    </>
                  )}
                  {['in_stock', 'returned', 'warranty'].includes(lookupResult.status) && (
                    <Button size="sm" variant="destructive" onClick={() => statusMutation.mutate({ id: lookupResult.id, action: 'defective' })}>Rusak</Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Warranty Expiring Tab */}
      {activeTab === 'warranty' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Garansi Hampir Habis</CardTitle>
            <CardDescription>Produk dengan garansi berakhir dalam 30 hari</CardDescription>
          </CardHeader>
          <CardContent>
            {warrantyLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : (warrantyExpiring ?? []).length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Tidak ada garansi yang hampir habis</p>
            ) : (
              <div className="space-y-2">
                {(warrantyExpiring ?? []).map((sn) => (
                  <div key={sn.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <div>
                        <p className="text-sm font-medium font-mono">{sn.serialNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {sn.product?.name ?? 'Unknown'} | Garansi s/d: {formatDate(sn.warrantyExpiry)}
                        </p>
                        {sn.customer && <p className="text-xs text-muted-foreground">Pelanggan: {sn.customer.name}</p>}
                      </div>
                    </div>
                    <Badge variant={STATUS_COLORS[sn.status]}>{STATUS_LABELS[sn.status]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Register Tab */}
      {activeTab === 'register' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daftarkan Serial Number</CardTitle>
            <CardDescription>Catat serial number produk baru</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Produk</Label>
              <select
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
                <Label>Serial Number</Label>
                <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="SN-2026-001" />
              </div>
              <div>
                <Label>Harga Beli (opsional)</Label>
                <Input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="5000000" />
              </div>
              <div>
                <Label>Garansi Sampai</Label>
                <Input type="date" value={warrantyExpiry} onChange={(e) => setWarrantyExpiry(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Catatan</Label>
              <Input value={regNotes} onChange={(e) => setRegNotes(e.target.value)} placeholder="Catatan..." />
            </div>
            <Button
              onClick={() => registerMutation.mutate()}
              disabled={!productId || !serialNumber || !outletId || registerMutation.isPending}
            >
              <Plus className="mr-1 h-4 w-4" /> Daftarkan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
