import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemTrackingApi, type ServiceItemStatus } from '@/api/endpoints/item-tracking.api';
import { useUIStore } from '@/stores/ui.store';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
import { isAxiosError } from 'axios';
import { ErrorState } from '@/components/shared/error-state';
import { Package, Plus, Search, Ticket, User, Phone, ArrowRight } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  received: 'Diterima',
  processing: 'Diproses',
  ready: 'Siap Ambil',
  delivered: 'Diserahkan',
  cancelled: 'Dibatalkan',
};

const STATUS_COLORS: Record<string, string> = {
  received: 'bg-blue-500',
  processing: 'bg-amber-500',
  ready: 'bg-green-500',
  delivered: 'bg-gray-400',
  cancelled: 'bg-red-500',
};

const NEXT_STATUS: Partial<Record<ServiceItemStatus, ServiceItemStatus>> = {
  received: 'processing',
  processing: 'ready',
  ready: 'delivered',
};

const NEXT_LABEL: Record<string, string> = {
  received: 'Proses',
  processing: 'Siap',
  ready: 'Serahkan',
};

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(value) || 0);
}

export function ItemTrackingPage() {
  const queryClient = useQueryClient();
  const outletId = useUIStore((s) => s.selectedOutletId) ?? '';

  const [activeTab, setActiveTab] = useState<'active' | 'all' | 'lookup' | 'receive'>('active');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServiceItemStatus | ''>('');
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketResult, setTicketResult] = useState<Awaited<ReturnType<typeof itemTrackingApi.findByTicket>> | null>(null);
  const [ticketError, setTicketError] = useState('');

  // Receive form state
  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [estimatedReady, setEstimatedReady] = useState('');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [recNotes, setRecNotes] = useState('');

  // Keys share the 'item-tracking' prefix so mutations can invalidate them all.
  const {
    data: activeItems,
    isLoading: activeLoading,
    isError: activeIsError,
    error: activeError,
    refetch: refetchActive,
  } = useQuery({
    queryKey: ['item-tracking', 'active', outletId],
    queryFn: () => itemTrackingApi.getActive(outletId),
    enabled: !!outletId && activeTab === 'active',
  });

  const {
    data: allItems,
    isLoading: allLoading,
    isError: allIsError,
    error: allError,
    refetch: refetchAll,
  } = useQuery({
    queryKey: ['item-tracking', 'all', outletId, statusFilter, search],
    queryFn: () => itemTrackingApi.listByOutlet(outletId, { status: statusFilter || undefined, search: search || undefined }),
    enabled: !!outletId && activeTab === 'all',
  });

  const receiveMutation = useMutation({
    mutationFn: () =>
      itemTrackingApi.receive({
        outletId,
        itemName,
        itemDescription: itemDesc || undefined,
        quantity: quantity ? parseInt(quantity, 10) : undefined,
        serviceName,
        servicePrice: parseFloat(servicePrice),
        // datetime-local has no offset: convert the local time to an ISO instant.
        estimatedReady: estimatedReady ? new Date(estimatedReady).toISOString() : undefined,
        customerName: custName || undefined,
        customerPhone: custPhone || undefined,
        notes: recNotes || undefined,
      }),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['item-tracking'] });
      toast.success({ title: `Item diterima! Tiket: ${item.ticketNumber}` });
      setActiveTab('active');
      setItemName('');
      setItemDesc('');
      setQuantity('1');
      setServiceName('');
      setServicePrice('');
      setEstimatedReady('');
      setCustName('');
      setCustPhone('');
      setRecNotes('');
    },
    onError: (error) => handleMutationError(error, 'Gagal menerima item'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ServiceItemStatus }) => itemTrackingApi.updateStatus(id, status),
    onSuccess: (updated, variables) => {
      queryClient.invalidateQueries({ queryKey: ['item-tracking'] });
      toast.success({ title: 'Status diperbarui' });
      // Keep the looked-up ticket in sync so its next-step button is current.
      if (ticketResult && ticketResult.id === variables.id) {
        setTicketResult({ ...ticketResult, ...updated });
      }
    },
    onError: (error) => handleMutationError(error, 'Gagal memperbarui status'),
  });

  const lookupMutation = useMutation({
    mutationFn: (ticket: string) => itemTrackingApi.findByTicket(ticket),
    onSuccess: (data) => {
      setTicketResult(data);
      setTicketError('');
    },
    onError: (error) => {
      setTicketResult(null);
      setTicketError(
        isAxiosError(error) && error.response?.status === 404
          ? 'Tiket tidak ditemukan'
          : 'Gagal memeriksa tiket. Periksa koneksi lalu coba lagi.',
      );
    },
  });

  if (!outletId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pelacakan Item" />
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
            Pilih outlet terlebih dahulu di pengaturan
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderItemCard = (item: Awaited<ReturnType<typeof itemTrackingApi.getActive>>[number]) => (
    <div key={item.id} className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <Package className="h-5 w-5 text-muted-foreground" />
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{item.itemName}</p>
            <Badge variant="outline" className="text-[10px]">{item.ticketNumber}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {item.serviceName} | {formatCurrency(item.servicePrice)} | Qty: {item.quantity}
          </p>
          {(item.customerName || item.customer?.name) && (
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" /> {item.customerName ?? item.customer?.name}
              {(item.customerPhone || item.customer?.phone) && (
                <><Phone className="h-3 w-3 ml-1" /> {item.customerPhone ?? item.customer?.phone}</>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={STATUS_COLORS[item.status]}>{STATUS_LABELS[item.status]}</Badge>
        {NEXT_STATUS[item.status] && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => statusMutation.mutate({ id: item.id, status: NEXT_STATUS[item.status]! })}
            disabled={statusMutation.isPending}
          >
            <ArrowRight className="mr-1 h-3 w-3" /> {NEXT_LABEL[item.status]}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pelacakan Item"
        description="Tracking item pelanggan (laundry, service, dll)"
      >
        <Button onClick={() => setActiveTab('receive')}>
          <Plus className="mr-1 h-4 w-4" /> Terima Item
        </Button>
      </PageHeader>

      <div className="flex gap-2">
        {(['active', 'all', 'lookup', 'receive'] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'active' ? 'Aktif' : tab === 'all' ? 'Semua' : tab === 'lookup' ? 'Cek Tiket' : 'Terima Baru'}
          </Button>
        ))}
      </div>

      {/* Active Items */}
      {activeTab === 'active' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Item Aktif</CardTitle>
            <CardDescription>{activeItems?.length ?? 0} item sedang diproses</CardDescription>
          </CardHeader>
          <CardContent>
            {activeLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
            ) : activeIsError ? (
              <ErrorState error={activeError} onRetry={() => refetchActive()} />
            ) : (activeItems ?? []).length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Tidak ada item aktif</p>
            ) : (
              <div className="space-y-2">{(activeItems ?? []).map(renderItemCard)}</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Items */}
      {activeTab === 'all' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Cari..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <select
                aria-label="Filter status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ServiceItemStatus | '')}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Semua Status</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {allLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
            ) : allIsError ? (
              <ErrorState error={allError} onRetry={() => refetchAll()} />
            ) : (allItems ?? []).length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Tidak ada item</p>
            ) : (
              <div className="space-y-2">{(allItems ?? []).map(renderItemCard)}</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ticket Lookup */}
      {activeTab === 'lookup' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cek Status via Tiket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                placeholder="Masukkan nomor tiket..."
                onKeyDown={(e) => e.key === 'Enter' && ticketSearch && lookupMutation.mutate(ticketSearch)}
              />
              <Button onClick={() => lookupMutation.mutate(ticketSearch)} disabled={!ticketSearch || lookupMutation.isPending}>
                <Ticket className="mr-1 h-4 w-4" /> Cek
              </Button>
            </div>
            {ticketError && <p className="text-sm text-destructive">{ticketError}</p>}
            {ticketResult && renderItemCard(ticketResult)}
          </CardContent>
        </Card>
      )}

      {/* Receive Form */}
      {activeTab === 'receive' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Terima Item Baru</CardTitle>
            <CardDescription>Catat item pelanggan yang masuk</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="it-name">Nama Item</Label>
                <Input id="it-name" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Kemeja Putih" />
              </div>
              <div>
                <Label htmlFor="it-qty">Jumlah</Label>
                <Input id="it-qty" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="1" />
              </div>
              <div>
                <Label htmlFor="it-service">Nama Layanan</Label>
                <Input id="it-service" value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Cuci Setrika" />
              </div>
              <div>
                <Label htmlFor="it-price">Harga Layanan</Label>
                <Input id="it-price" type="number" value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} placeholder="25000" />
              </div>
              <div>
                <Label htmlFor="it-ready">Estimasi Selesai</Label>
                <Input id="it-ready" type="datetime-local" value={estimatedReady} onChange={(e) => setEstimatedReady(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="it-desc">Deskripsi Item (opsional)</Label>
              <Input id="it-desc" value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} placeholder="Noda di bagian depan" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="it-customer">Nama Pelanggan</Label>
                <Input id="it-customer" value={custName} onChange={(e) => setCustName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="it-phone">No. Telepon</Label>
                <Input id="it-phone" type="tel" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} placeholder="08xxx" />
              </div>
            </div>
            <div>
              <Label htmlFor="it-notes">Catatan</Label>
              <Input id="it-notes" value={recNotes} onChange={(e) => setRecNotes(e.target.value)} />
            </div>
            <Button
              onClick={() => receiveMutation.mutate()}
              disabled={!itemName || !serviceName || !servicePrice || receiveMutation.isPending}
            >
              <Plus className="mr-1 h-4 w-4" /> Terima Item
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
