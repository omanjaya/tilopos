import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '@/api/endpoints/inventory.api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MobileNavSpacer } from '@/components/shared/mobile-nav';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/lib/toast-utils';
import { cn } from '@/lib/utils';
import {
  Search,
  Package,
  AlertTriangle,
  XCircle,
  SlidersHorizontal,
  Loader2,
} from 'lucide-react';
import type { StockLevel } from '@/types/inventory.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

/**
 * StockPage Mobile Version
 *
 * Mobile-optimized inventory stock management with:
 * - Swipeable metric cards
 * - Status tabs (All, Low Stock, Out of Stock)
 * - Stock cards with color indicators
 * - Low stock alerts section
 * - Bottom sheet for adjustments
 */

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
  const [search, setSearch] = useState('');
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
      toast.success({ title: 'Stok berhasil disesuaikan' });
      closeAdjustDialog();
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menyesuaikan stok',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const metrics = useMemo(() => {
    if (!stockData) return { total: 0, low: 0, out: 0 };
    return {
      total: stockData.length,
      low: stockData.filter((item) => getStockStatus(item) === 'low').length,
      out: stockData.filter((item) => getStockStatus(item) === 'out').length,
    };
  }, [stockData]);

  const filteredData = useMemo(() => {
    if (!stockData) return [];
    let filtered = stockData;

    // Filter by status
    if (filter === 'low') filtered = filtered.filter((item) => getStockStatus(item) === 'low');
    if (filter === 'out') filtered = filtered.filter((item) => getStockStatus(item) === 'out');

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.productName.toLowerCase().includes(searchLower) ||
          item.sku?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [stockData, filter, search]);

  const lowStockItems = useMemo(() => {
    if (!stockData) return [];
    return stockData.filter((item) => getStockStatus(item) === 'low' || getStockStatus(item) === 'out');
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

  const metricCards = [
    {
      title: 'Total Produk',
      value: String(metrics.total),
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Stok Rendah',
      value: String(metrics.low),
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Stok Habis',
      value: String(metrics.out),
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold">Stok Barang</h1>
              <p className="text-sm text-muted-foreground">
                {filteredData.length} produk
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari produk atau SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          {/* Status Tabs */}
          <Tabs value={filter} onValueChange={(v) => setFilter(v as StockFilter)} className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-auto">
              <TabsTrigger value="all" className="text-xs py-2">
                Semua
              </TabsTrigger>
              <TabsTrigger value="low" className="text-xs py-2">
                Stok Rendah
              </TabsTrigger>
              <TabsTrigger value="out" className="text-xs py-2">
                Habis
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Metric Cards - Horizontal Scroll */}
        <div className="px-4 py-4">
          {isLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="min-w-[200px] snap-start animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-16 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
              {metricCards.map((metric, i) => (
                <MetricCardMobile key={i} {...metric} />
              ))}
            </div>
          )}
          <div className="flex justify-center gap-1 mt-3">
            {metricCards.map((_, i) => (
              <div key={i} className="h-1.5 w-1.5 rounded-full bg-muted" />
            ))}
          </div>
        </div>

        {/* Low Stock Alerts */}
        {filter === 'all' && lowStockItems.length > 0 && (
          <div className="px-4 pb-4">
            <Card className="border-yellow-500/20 bg-yellow-50/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-yellow-500/10 p-2 shrink-0">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1">Peringatan Stok</h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      {lowStockItems.length} produk memerlukan perhatian
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setFilter('low')}
                    >
                      Lihat Detail
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stock List */}
        <div className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted/50 p-6 mb-4">
                <Package className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">Tidak ada data stok</h3>
              <p className="text-sm text-muted-foreground">
                {search ? 'Coba kata kunci lain' : 'Belum ada data stok untuk outlet ini'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredData.map((stock) => (
                <StockCard
                  key={stock.productId}
                  stock={stock}
                  onAdjust={() => openAdjustDialog(stock)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Spacer for bottom nav */}
        <div className="h-4" />
      </div>

      {/* Floating Action Button - Quick Adjust */}
      {filteredData.length > 0 && (
        <Button
          size="lg"
          className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-lg"
          onClick={() => openAdjustDialog()}
          aria-label="Adjustment stok"
        >
          <SlidersHorizontal className="h-6 w-6" />
        </Button>
      )}

      {/* Mobile Nav Spacer */}
      <MobileNavSpacer />

      {/* Stock Adjustment Sheet */}
      <Sheet open={adjustDialogOpen} onOpenChange={(open) => !open && closeAdjustDialog()}>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle>Adjustment Stok</SheetTitle>
            <SheetDescription>
              Sesuaikan jumlah stok produk
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Product Selection */}
            {adjustProduct ? (
              <div className="p-3 bg-muted/50 rounded-lg">
                <Label className="text-xs text-muted-foreground">Produk</Label>
                <p className="font-semibold mt-1">
                  {adjustProduct.productName}
                </p>
                {adjustProduct.sku && (
                  <p className="text-sm text-muted-foreground">
                    SKU: {adjustProduct.sku}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Stok saat ini: <span className="font-semibold">{adjustProduct.currentStock}</span>
                </p>
              </div>
            ) : (
              <div>
                <Label>Pilih Produk</Label>
                <Select
                  value=""
                  onValueChange={(val) => {
                    const found = stockData?.find((s) => s.productId === val);
                    if (found) setAdjustProduct(found);
                  }}
                >
                  <SelectTrigger className="h-12 mt-2">
                    <SelectValue placeholder="Pilih produk" />
                  </SelectTrigger>
                  <SelectContent>
                    {stockData?.map((item) => (
                      <SelectItem key={item.productId} value={item.productId}>
                        {item.productName} {item.sku && `(${item.sku})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Adjustment Type */}
            <div>
              <Label>Tipe Adjustment</Label>
              <Select value={adjustType} onValueChange={(v) => setAdjustType(v as 'add' | 'remove' | 'set')}>
                <SelectTrigger className="h-12 mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Tambah Stok</SelectItem>
                  <SelectItem value="remove">Kurangi Stok</SelectItem>
                  <SelectItem value="set">Set Stok</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div>
              <Label>Jumlah</Label>
              <Input
                type="number"
                min={0}
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                placeholder="Masukkan jumlah"
                className="h-12 mt-2"
              />
            </div>

            {/* Reason */}
            <div>
              <Label>Alasan Adjustment</Label>
              <Textarea
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Contoh: Stok opname, barang rusak, dll"
                className="mt-2 min-h-[100px]"
              />
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4">
              <Button
                className="w-full h-12"
                onClick={handleAdjustSubmit}
                disabled={!adjustProduct || !adjustQuantity || !adjustReason || adjustMutation.isPending}
              >
                {adjustMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Adjustment
              </Button>
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={closeAdjustDialog}
                disabled={adjustMutation.isPending}
              >
                Batal
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/**
 * MetricCardMobile Component
 * Individual swipeable metric card
 */
interface MetricCardMobileProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

function MetricCardMobile({ title, value, icon: Icon, color, bgColor }: MetricCardMobileProps) {
  return (
    <Card className="min-w-[200px] snap-start">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={cn('rounded-full p-3', bgColor)}>
            <Icon className={cn('h-6 w-6', color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * StockCard Component
 * Individual stock item card
 */
interface StockCardProps {
  stock: StockLevel;
  onAdjust: () => void;
}

function StockCard({ stock, onAdjust }: StockCardProps) {
  const status = getStockStatus(stock);

  const statusConfig = {
    normal: {
      badge: <Badge className="bg-green-500 hover:bg-green-600">Normal</Badge>,
      borderColor: 'border-l-green-500',
    },
    low: {
      badge: <Badge className="bg-yellow-500 hover:bg-yellow-600">Stok Rendah</Badge>,
      borderColor: 'border-l-yellow-500',
    },
    out: {
      badge: <Badge variant="destructive">Habis</Badge>,
      borderColor: 'border-l-red-500',
    },
  };

  return (
    <Card className={cn('overflow-hidden border-l-4', statusConfig[status].borderColor)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-base mb-1">{stock.productName}</h3>
            {stock.sku && (
              <p className="text-xs text-muted-foreground">SKU: {stock.sku}</p>
            )}
          </div>
          {statusConfig[status].badge}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-xs text-muted-foreground">Stok Saat Ini</p>
            <p className="text-lg font-bold">{stock.currentStock}</p>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-xs text-muted-foreground">Stok Minimum</p>
            <p className="text-lg font-semibold">{stock.minStock}</p>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full h-10"
          onClick={onAdjust}
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Adjustment Stok
        </Button>
      </CardContent>
    </Card>
  );
}
