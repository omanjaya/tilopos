import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workOrdersApi } from '@/api/endpoints/work-orders.api';
import { useUIStore } from '@/stores/ui.store';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Wrench, Plus, Search, ChevronRight, User, Phone } from 'lucide-react';
import type { WorkOrder } from '@/api/endpoints/work-orders.api';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  in_progress: 'Dikerjakan',
  waiting_parts: 'Tunggu Sparepart',
  completed: 'Selesai',
  delivered: 'Diserahkan',
  cancelled: 'Dibatalkan',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  in_progress: 'default',
  waiting_parts: 'secondary',
  completed: 'secondary',
  delivered: 'secondary',
  cancelled: 'destructive',
};

const NEXT_STATUS: Record<string, string> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: 'delivered',
};

const NEXT_LABEL: Record<string, string> = {
  pending: 'Mulai Kerjakan',
  in_progress: 'Selesai',
  completed: 'Serahkan',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function WorkOrderDetail({ workOrder, onBack }: { workOrder: WorkOrder; onBack: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: (status: string) => workOrdersApi.updateStatus(workOrder.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast({ title: 'Status diperbarui' });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">← Kembali</Button>
            <CardTitle className="text-lg">{workOrder.title}</CardTitle>
            <CardDescription>{workOrder.orderNumber}</CardDescription>
          </div>
          <Badge variant={STATUS_VARIANTS[workOrder.status]}>{STATUS_LABELS[workOrder.status]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {workOrder.description && <p className="text-sm">{workOrder.description}</p>}

        {/* Item Info */}
        {(workOrder.itemDescription || workOrder.itemBrand) && (
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-sm font-medium">Info Barang</p>
            {workOrder.itemDescription && <p className="text-sm text-muted-foreground">{workOrder.itemDescription}</p>}
            <div className="flex gap-4 text-xs text-muted-foreground">
              {workOrder.itemBrand && <span>Merk: {workOrder.itemBrand}</span>}
              {workOrder.itemModel && <span>Model: {workOrder.itemModel}</span>}
              {workOrder.itemSerial && <span>SN: {workOrder.itemSerial}</span>}
            </div>
          </div>
        )}

        {workOrder.diagnosis && (
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium">Diagnosis</p>
            <p className="text-sm text-muted-foreground">{workOrder.diagnosis}</p>
          </div>
        )}

        {/* Customer */}
        {(workOrder.customerName || workOrder.customer) && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            {workOrder.customerName ?? workOrder.customer?.name}
            {(workOrder.customerPhone ?? workOrder.customer?.phone) && (
              <><Phone className="h-4 w-4 ml-2 text-muted-foreground" /> {workOrder.customerPhone ?? workOrder.customer?.phone}</>
            )}
          </div>
        )}

        {/* Cost */}
        <div className="flex gap-4">
          {workOrder.estimatedCost != null && (
            <div>
              <p className="text-xs text-muted-foreground">Estimasi Biaya</p>
              <p className="font-medium">{formatCurrency(workOrder.estimatedCost)}</p>
            </div>
          )}
          {workOrder.finalCost != null && (
            <div>
              <p className="text-xs text-muted-foreground">Biaya Akhir</p>
              <p className="font-medium">{formatCurrency(workOrder.finalCost)}</p>
            </div>
          )}
        </div>

        {/* Items */}
        {workOrder.items && workOrder.items.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Rincian Biaya</p>
            {workOrder.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded border p-2 text-sm">
                <div>
                  <span className="font-medium">{item.description}</span>
                  <Badge variant="outline" className="ml-2 text-[10px]">{item.type}</Badge>
                </div>
                <span>{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {NEXT_STATUS[workOrder.status] && (
          <Button onClick={() => statusMutation.mutate(NEXT_STATUS[workOrder.status]!)} disabled={statusMutation.isPending}>
            {NEXT_LABEL[workOrder.status]}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function WorkOrdersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const outletId = useUIStore((s) => s.selectedOutletId) ?? '';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemBrand, setItemBrand] = useState('');
  const [itemModel, setItemModel] = useState('');
  const [itemSerial, setItemSerial] = useState('');
  const [estCost, setEstCost] = useState('');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [woNotes, setWoNotes] = useState('');

  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['work-orders', outletId, statusFilter, search],
    queryFn: () => workOrdersApi.list(outletId, { status: statusFilter || undefined, search: search || undefined }),
    enabled: !!outletId,
  });

  const { data: selectedWO } = useQuery({
    queryKey: ['work-order-detail', selectedId],
    queryFn: () => workOrdersApi.getById(selectedId!),
    enabled: !!selectedId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      workOrdersApi.create({
        outletId,
        title,
        itemDescription: itemDesc || undefined,
        itemBrand: itemBrand || undefined,
        itemModel: itemModel || undefined,
        itemSerial: itemSerial || undefined,
        estimatedCost: estCost ? parseFloat(estCost) : undefined,
        customerName: custName || undefined,
        customerPhone: custPhone || undefined,
        notes: woNotes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast({ title: 'Work order berhasil dibuat' });
      setShowForm(false);
      setTitle('');
      setItemDesc('');
      setItemBrand('');
      setItemModel('');
      setItemSerial('');
      setEstCost('');
      setCustName('');
      setCustPhone('');
      setWoNotes('');
    },
    onError: () => toast({ variant: 'destructive', title: 'Gagal membuat work order' }),
  });

  if (!outletId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Work Orders" />
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
            Pilih outlet terlebih dahulu di pengaturan
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedId && selectedWO) {
    return (
      <div className="space-y-6">
        <PageHeader title="Work Orders" description="Detail work order" />
        <WorkOrderDetail workOrder={selectedWO} onBack={() => setSelectedId(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Orders"
        description="Kelola pekerjaan service dan bengkel"
      >
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" /> Work Order Baru
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Semua Status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work Order Baru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Judul Pekerjaan</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Service AC, Ganti LCD, dll" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Deskripsi Barang</Label>
                <Input value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} placeholder="Laptop Asus" />
              </div>
              <div>
                <Label>Merk</Label>
                <Input value={itemBrand} onChange={(e) => setItemBrand(e.target.value)} placeholder="Asus" />
              </div>
              <div>
                <Label>Model</Label>
                <Input value={itemModel} onChange={(e) => setItemModel(e.target.value)} placeholder="ROG Zephyrus" />
              </div>
              <div>
                <Label>Serial Number</Label>
                <Input value={itemSerial} onChange={(e) => setItemSerial(e.target.value)} placeholder="SN123" />
              </div>
              <div>
                <Label>Estimasi Biaya</Label>
                <Input type="number" value={estCost} onChange={(e) => setEstCost(e.target.value)} placeholder="500000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nama Pelanggan</Label>
                <Input value={custName} onChange={(e) => setCustName(e.target.value)} />
              </div>
              <div>
                <Label>No. Telepon</Label>
                <Input value={custPhone} onChange={(e) => setCustPhone(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Catatan</Label>
              <Input value={woNotes} onChange={(e) => setWoNotes(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => createMutation.mutate()} disabled={!title || createMutation.isPending}>
                <Plus className="mr-1 h-4 w-4" /> Buat Work Order
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : (workOrders ?? []).length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Tidak ada work order</p>
          ) : (
            <div className="space-y-2">
              {(workOrders ?? []).map((wo) => (
                <button
                  key={wo.id}
                  onClick={() => setSelectedId(wo.id)}
                  className="flex w-full items-center justify-between rounded-lg border p-4 text-left hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Wrench className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{wo.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {wo.orderNumber} | {formatDate(wo.createdAt)}
                        {wo.customerName && ` | ${wo.customerName}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANTS[wo.status]}>{STATUS_LABELS[wo.status]}</Badge>
                    {wo.estimatedCost != null && (
                      <span className="text-sm font-medium">{formatCurrency(wo.estimatedCost)}</span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
