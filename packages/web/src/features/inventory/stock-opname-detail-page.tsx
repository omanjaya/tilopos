import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockOpnameApi } from '@/api/endpoints/stock-opname.api';
import { PageHeader } from '@/components/shared/page-header';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/lib/toast-utils';
import { formatDateTime } from '@/lib/format';
import {
  ArrowLeft,
  Save,
  CheckCircle,
  XCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { handleMutationError } from '@/lib/api-error-handler';
import type { StockOpnameItem, StockOpnameStatus } from '@/types/stock-opname.types';

const STATUS_CONFIG: Record<StockOpnameStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  in_progress: { label: 'Berlangsung', variant: 'warning' },
  completed: { label: 'Selesai', variant: 'success' },
  cancelled: { label: 'Dibatalkan', variant: 'destructive' },
};

export function StockOpnameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [counts, setCounts] = useState<Record<string, string>>({});
  const [showComplete, setShowComplete] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  const { data: opname, isLoading } = useQuery({
    queryKey: ['stock-opname', id],
    queryFn: () => stockOpnameApi.getById(id!),
    enabled: !!id,
  });

  // Initialize counts from server data
  useEffect(() => {
    if (opname?.items) {
      const initial: Record<string, string> = {};
      for (const item of opname.items) {
        if (item.actualQuantity !== null) {
          initial[item.id] = String(item.actualQuantity);
        }
      }
      setCounts(initial);
    }
  }, [opname?.items]);

  const updateMutation = useMutation({
    mutationFn: () => {
      const items = Object.entries(counts)
        .filter(([, val]) => val !== '')
        .map(([itemId, val]) => ({
          itemId,
          actualQuantity: Number(val),
        }));
      return stockOpnameApi.updateItems(id!, items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname', id] });
      toast.success({ title: 'Hitungan berhasil disimpan' });
    },
    onError: (error) => handleMutationError(error, 'Gagal menyimpan hitungan'),
  });

  const completeMutation = useMutation({
    mutationFn: () => stockOpnameApi.complete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname'] });
      toast.success({ title: 'Stock opname selesai, stok telah disesuaikan' });
      setShowComplete(false);
    },
    onError: (error) => handleMutationError(error, 'Gagal menyelesaikan opname'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => stockOpnameApi.cancel(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname'] });
      toast.success({ title: 'Stock opname dibatalkan' });
      setShowCancel(false);
      navigate('/app/inventory/stock-opname');
    },
    onError: (error) => handleMutationError(error, 'Gagal membatalkan opname'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!opname) return null;

  const isEditable = opname.status === 'draft' || opname.status === 'in_progress';
  const statusConfig = STATUS_CONFIG[opname.status];
  const items = opname.items || [];

  // Calculate summary
  const totalItems = items.length;
  const countedItems = items.filter((i) => i.actualQuantity !== null).length;
  const surplusItems = items.filter((i) => i.difference !== null && Number(i.difference) > 0).length;
  const deficitItems = items.filter((i) => i.difference !== null && Number(i.difference) < 0).length;

  const getItemName = (item: StockOpnameItem) => {
    const productName = item.product?.name || 'Unknown';
    const variantName = item.variant?.name;
    return variantName ? `${productName} - ${variantName}` : productName;
  };

  const getSku = (item: StockOpnameItem) => {
    return item.variant?.sku || item.product?.sku || '-';
  };

  const getDiffDisplay = (item: StockOpnameItem) => {
    const val = counts[item.id];
    if (val === undefined || val === '') return null;

    const diff = Number(val) - Number(item.systemQuantity);
    if (diff === 0) return <span className="flex items-center gap-1 text-muted-foreground"><Minus className="h-3 w-3" /> 0</span>;
    if (diff > 0) return <span className="flex items-center gap-1 text-green-600"><TrendingUp className="h-3 w-3" />+{diff}</span>;
    return <span className="flex items-center gap-1 text-red-600"><TrendingDown className="h-3 w-3" />{diff}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-1">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/inventory/stock-opname')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={opname.opnameNumber}
          description={`Outlet: ${opname.outlet?.name || '-'} | Dibuat: ${formatDateTime(opname.createdAt)} oleh ${opname.createdByEmployee?.name || '-'}`}
        >
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </PageHeader>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Item</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sudah Dihitung</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{countedItems}/{totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Surplus</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{surplusItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Defisit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{deficitItems}</p>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Produk</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">SKU</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Stok Sistem</th>
                  <th className="px-4 py-3 text-right text-sm font-medium w-[140px]">Stok Aktual</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Selisih</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm font-medium">{getItemName(item)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{getSku(item)}</td>
                    <td className="px-4 py-3 text-right text-sm">{Number(item.systemQuantity)}</td>
                    <td className="px-4 py-3 text-right">
                      {isEditable ? (
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          className="h-8 w-[120px] ml-auto text-right"
                          value={counts[item.id] ?? ''}
                          onChange={(e) =>
                            setCounts((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          placeholder="..."
                        />
                      ) : (
                        <span className="text-sm">
                          {item.actualQuantity !== null ? Number(item.actualQuantity) : '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      {isEditable ? getDiffDisplay(item) : (
                        item.difference !== null ? (
                          Number(item.difference) === 0 ? (
                            <span className="text-muted-foreground">0</span>
                          ) : Number(item.difference) > 0 ? (
                            <span className="text-green-600">+{Number(item.difference)}</span>
                          ) : (
                            <span className="text-red-600">{Number(item.difference)}</span>
                          )
                        ) : '-'
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Tidak ada item dalam opname ini
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {isEditable && (
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => setShowCancel(true)}>
            <XCircle className="mr-2 h-4 w-4" />
            Batalkan
          </Button>
          <Button variant="outline" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Hitungan
          </Button>
          <Button onClick={() => setShowComplete(true)}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Selesaikan & Sesuaikan Stok
          </Button>
        </div>
      )}

      {/* Complete Confirm */}
      <ConfirmDialog
        open={showComplete}
        onOpenChange={(open) => !open && setShowComplete(false)}
        onConfirm={() => completeMutation.mutate()}
        title="Selesaikan Stock Opname?"
        description="Stok sistem akan disesuaikan dengan jumlah aktual yang sudah dihitung. Pastikan semua item sudah dihitung dengan benar."
        confirmLabel="Ya, Selesaikan"
        isLoading={completeMutation.isPending}
      />

      {/* Cancel Confirm */}
      <ConfirmDialog
        open={showCancel}
        onOpenChange={(open) => !open && setShowCancel(false)}
        onConfirm={() => cancelMutation.mutate()}
        title="Batalkan Stock Opname?"
        description="Stock opname ini akan dibatalkan. Tidak ada perubahan stok yang akan dilakukan."
        confirmLabel="Ya, Batalkan"
        variant="destructive"
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
