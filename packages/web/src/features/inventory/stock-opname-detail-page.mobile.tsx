import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockOpnameApi } from '@/api/endpoints/stock-opname.api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MobileNavSpacer } from '@/components/shared/mobile-nav';
import { toast } from '@/lib/toast-utils';
import { formatDateTime } from '@/lib/format';
import { ArrowLeft, Save, CheckCircle, Loader2 } from 'lucide-react';
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

  const { data: opname, isLoading } = useQuery({
    queryKey: ['stock-opname', id],
    queryFn: () => stockOpnameApi.getById(id!),
    enabled: !!id,
  });

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
      toast.success({ title: 'Hitungan disimpan' });
    },
    onError: (error) => handleMutationError(error, 'Gagal menyimpan'),
  });

  const completeMutation = useMutation({
    mutationFn: () => stockOpnameApi.complete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname'] });
      toast.success({ title: 'Stok disesuaikan' });
      navigate('/app/inventory/stock-opname');
    },
    onError: (error) => handleMutationError(error, 'Gagal menyelesaikan'),
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

  const getItemName = (item: StockOpnameItem) => {
    const productName = item.product?.name || 'Unknown';
    const variantName = item.variant?.name;
    return variantName ? `${productName} - ${variantName}` : productName;
  };

  const getDiff = (item: StockOpnameItem) => {
    const val = counts[item.id];
    if (val === undefined || val === '') return null;
    return Number(val) - Number(item.systemQuantity);
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/app/inventory/stock-opname')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">{opname.opnameNumber}</h1>
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {opname.outlet?.name} &bull; {formatDateTime(opname.createdAt)}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 px-4">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Dihitung</p>
            <p className="text-lg font-bold">{items.filter((i) => i.actualQuantity !== null).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Selisih</p>
            <p className="text-lg font-bold text-red-600">
              {items.filter((i) => i.difference !== null && Number(i.difference) !== 0).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Item Cards */}
      <div className="space-y-2 px-4">
        {items.map((item) => {
          const diff = getDiff(item);
          return (
            <Card key={item.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{getItemName(item)}</p>
                    <p className="text-xs text-muted-foreground">Sistem: {Number(item.systemQuantity)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditable ? (
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        className="h-8 w-20 text-right text-sm"
                        value={counts[item.id] ?? ''}
                        onChange={(e) =>
                          setCounts((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        placeholder="..."
                      />
                    ) : (
                      <span className="text-sm font-medium">
                        {item.actualQuantity !== null ? Number(item.actualQuantity) : '-'}
                      </span>
                    )}
                    {diff !== null && (
                      <span className={`text-xs font-medium w-10 text-right ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <MobileNavSpacer />

      {/* Fixed bottom actions */}
      {isEditable && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background p-3 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Simpan
          </Button>
          <Button
            className="flex-1"
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
          >
            {completeMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1 h-4 w-4" />}
            Selesaikan
          </Button>
        </div>
      )}
    </div>
  );
}
