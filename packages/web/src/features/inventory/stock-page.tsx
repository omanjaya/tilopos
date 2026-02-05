import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '@/api/endpoints/inventory.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { MetricCard } from '@/components/shared/metric-card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/lib/toast-utils';
import { Package, AlertTriangle, XCircle, Loader2, SlidersHorizontal } from 'lucide-react';
import type { StockLevel } from '@/types/inventory.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

type StockFilter = 'all' | 'low' | 'out';

function getStockStatus(item: StockLevel): 'normal' | 'low' | 'out' {
  if (item.currentStock === 0) return 'out';
  if (item.currentStock <= item.minStock) return 'low';
  return 'normal';
}

export function StockPage() {
  const queryClient = useQueryClient();
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const user = useAuthStore((s) => s.user);
  const outletId = selectedOutletId || user?.outletId || '';

  const [filter, setFilter] = useState<StockFilter>('all');
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<StockLevel | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'remove' | 'set'>('add');
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const { data: stockData, isLoading } = useQuery({
    queryKey: ['stock-levels', outletId],
    queryFn: () => inventoryApi.getStockLevels(outletId),
    enabled: !!outletId,
  });

  const adjustMutation = useMutation({
    mutationFn: inventoryApi.adjustStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
      toast.success({
        title: 'Stok berhasil disesuaikan',
        description: `Stok "${adjustProduct?.productName}" telah diperbarui`,
      });
      closeAdjustDialog();
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menyesuaikan stok',
        description: error.response?.data?.message || 'Terjadi kesalahan saat menyesuaikan stok',
      });
    },
  });

  const filteredData = useMemo(() => {
    if (!stockData) return [];
    if (filter === 'low') return stockData.filter((item) => getStockStatus(item) === 'low');
    if (filter === 'out') return stockData.filter((item) => getStockStatus(item) === 'out');
    return stockData;
  }, [stockData, filter]);

  const metrics = useMemo(() => {
    if (!stockData) return { total: 0, low: 0, out: 0 };
    return {
      total: stockData.length,
      low: stockData.filter((item) => getStockStatus(item) === 'low').length,
      out: stockData.filter((item) => getStockStatus(item) === 'out').length,
    };
  }, [stockData]);

  function openAdjustDialog(product?: StockLevel) {
    setAdjustProduct(product || null);
    setAdjustType('add');
    setAdjustQuantity('');
    setAdjustReason('');
    setAdjustDialogOpen(true);
  }

  function closeAdjustDialog() {
    setAdjustDialogOpen(false);
    setAdjustProduct(null);
    setAdjustType('add');
    setAdjustQuantity('');
    setAdjustReason('');
  }

  function handleAdjustSubmit() {
    if (!adjustProduct || !adjustQuantity || !adjustReason) return;
    adjustMutation.mutate({
      productId: adjustProduct.productId,
      outletId,
      quantity: Number(adjustQuantity),
      reason: adjustReason,
      type: adjustType,
    });
  }

  // Keyboard shortcut: N to open adjustment dialog
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        openAdjustDialog();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: Column<StockLevel>[] = [
    {
      key: 'product',
      header: 'Produk',
      cell: (row) => <span className="font-medium">{row.productName}</span>,
    },
    {
      key: 'sku',
      header: 'SKU',
      cell: (row) => <span className="text-muted-foreground">{row.sku ?? '-'}</span>,
    },
    {
      key: 'currentStock',
      header: 'Stok Saat Ini',
      cell: (row) => <span className="font-medium">{row.currentStock}</span>,
    },
    {
      key: 'minStock',
      header: 'Stok Minimum',
      cell: (row) => row.minStock,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const status = getStockStatus(row);
        if (status === 'out') return <Badge variant="destructive">Habis</Badge>;
        if (status === 'low') return <Badge className="bg-yellow-500 hover:bg-yellow-600">Stok Rendah</Badge>;
        return <Badge className="bg-green-500 hover:bg-green-600">Normal</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Aksi',
      cell: (row) => (
        <Button variant="outline" size="sm" onClick={() => openAdjustDialog(row)}>
          <SlidersHorizontal className="mr-2 h-4 w-4" /> Adjust
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Stok Barang" description="Monitor stok per outlet">
        <Button onClick={() => openAdjustDialog()} aria-keyshortcuts="N">
          <SlidersHorizontal className="mr-2 h-4 w-4" /> Adjustment Stok
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard title="Total Produk" value={String(metrics.total)} icon={Package} />
        <MetricCard title="Stok Rendah" value={String(metrics.low)} icon={AlertTriangle} />
        <MetricCard title="Stok Habis" value={String(metrics.out)} icon={XCircle} />
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as StockFilter)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="low">Stok Rendah</TabsTrigger>
          <TabsTrigger value="out">Habis</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        searchPlaceholder="Cari produk..."
        emptyTitle="Tidak ada data stok"
        emptyDescription="Belum ada data stok untuk outlet ini. Tambahkan produk terlebih dahulu untuk mulai tracking stok."
      />

      {/* Stock Adjustment Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={(open) => !open && closeAdjustDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjustment Stok</DialogTitle>
            <DialogDescription>
              Sesuaikan jumlah stok produk.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {adjustProduct ? (
              <div>
                <Label>Produk</Label>
                <p className="text-sm font-medium mt-1">
                  {adjustProduct.productName} ({adjustProduct.sku})
                </p>
                <p className="text-xs text-muted-foreground">
                  Stok saat ini: {adjustProduct.currentStock}
                </p>
              </div>
            ) : (
              <div>
                <Label>Produk</Label>
                <Select
                  value=""
                  onValueChange={(val) => {
                    const found = stockData?.find((s) => s.productId === val);
                    if (found) setAdjustProduct(found);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih produk" />
                  </SelectTrigger>
                  <SelectContent>
                    {stockData?.map((item) => (
                      <SelectItem key={item.productId} value={item.productId}>
                        {item.productName} ({item.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Tipe Adjustment</Label>
              <Select value={adjustType} onValueChange={(v) => setAdjustType(v as 'add' | 'remove' | 'set')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Tambah</SelectItem>
                  <SelectItem value="remove">Kurang</SelectItem>
                  <SelectItem value="set">Set</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Jumlah</Label>
              <Input
                type="number"
                min={0}
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                placeholder="Masukkan jumlah"
              />
            </div>

            <div>
              <Label>Alasan</Label>
              <Textarea
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Masukkan alasan adjustment"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeAdjustDialog} disabled={adjustMutation.isPending}>
              Batal
            </Button>
            <Button
              onClick={handleAdjustSubmit}
              disabled={!adjustProduct || !adjustQuantity || !adjustReason || adjustMutation.isPending}
              aria-busy={adjustMutation.isPending}
              aria-label={adjustMutation.isPending ? 'Menyimpan adjustment...' : undefined}
            >
              {adjustMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
