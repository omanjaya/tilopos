import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '@/api/endpoints/inventory.api';
import { settingsApi } from '@/api/endpoints/settings.api';
import { productsApi } from '@/api/endpoints/products.api';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/toast-utils';
import { Loader2, Plus, Trash2, Zap } from 'lucide-react';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

interface TransferItem {
  productId: string;
  productName: string;
  quantity: number;
}

interface DirectTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DirectTransferModal({ open, onOpenChange }: DirectTransferModalProps) {
  const queryClient = useQueryClient();
  const [sourceOutletId, setSourceOutletId] = useState('');
  const [destinationOutletId, setDestinationOutletId] = useState('');
  const [items, setItems] = useState<TransferItem[]>([]);
  const [notes, setNotes] = useState('');

  const { data: outlets } = useQuery({
    queryKey: ['outlets'],
    queryFn: settingsApi.getOutlets,
    enabled: open,
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list(),
    enabled: open,
  });

  const directTransferMutation = useMutation({
    mutationFn: () =>
      inventoryApi.directTransfer({
        sourceOutletId,
        destinationOutletId,
        items: items.map((item) => ({
          productId: item.productId,
          itemName: item.productName,
          quantity: item.quantity,
        })),
        notes: notes || undefined,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
      toast.success({
        title: 'Transfer langsung berhasil',
        description: `${result.itemCount} item ditransfer (${result.transferNumber})`,
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal melakukan transfer',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const resetForm = () => {
    setSourceOutletId('');
    setDestinationOutletId('');
    setItems([]);
    setNotes('');
  };

  const addItem = () => {
    setItems([...items, { productId: '', productName: '', quantity: 1 }]);
  };

  const updateItem = (index: number, field: keyof TransferItem, value: string | number) => {
    setItems(
      items.map((item, i) => {
        if (i !== index) return item;
        if (field === 'productId') {
          const product = products?.find((p) => p.id === value);
          return { ...item, productId: value as string, productName: product?.name ?? '' };
        }
        return { ...item, [field]: value };
      }),
    );
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const isValid =
    sourceOutletId &&
    destinationOutletId &&
    sourceOutletId !== destinationOutletId &&
    items.length > 0 &&
    items.every((item) => item.productId && item.quantity > 0);

  const activeOutlets = outlets?.filter((o) => o.isActive) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-warning" />
            Transfer Langsung
          </DialogTitle>
          <DialogDescription>
            Transfer stok langsung tanpa proses approval. Stok akan langsung dipindahkan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Outlet Selection */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Outlet Asal</Label>
              <Select value={sourceOutletId} onValueChange={setSourceOutletId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih outlet asal" />
                </SelectTrigger>
                <SelectContent>
                  {activeOutlets.map((outlet) => (
                    <SelectItem
                      key={outlet.id}
                      value={outlet.id}
                      disabled={outlet.id === destinationOutletId}
                    >
                      {outlet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Outlet Tujuan</Label>
              <Select value={destinationOutletId} onValueChange={setDestinationOutletId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih outlet tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {activeOutlets.map((outlet) => (
                    <SelectItem
                      key={outlet.id}
                      value={outlet.id}
                      disabled={outlet.id === sourceOutletId}
                    >
                      {outlet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {sourceOutletId === destinationOutletId && sourceOutletId && (
            <p className="text-sm text-destructive">Outlet asal dan tujuan tidak boleh sama</p>
          )}

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Item Transfer</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Tambah Item
              </Button>
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Belum ada item. Klik &quot;Tambah Item&quot; untuk memulai.
              </p>
            ) : (
              items.map((item, index) => (
                <div key={index} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Produk</Label>
                    <Select
                      value={item.productId}
                      onValueChange={(v) => updateItem(index, 'productId', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih produk" />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    className="shrink-0 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Catatan (opsional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Alasan transfer, dll."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            disabled={!isValid || directTransferMutation.isPending}
            onClick={() => directTransferMutation.mutate()}
          >
            {directTransferMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Zap className="mr-2 h-4 w-4" />
            Transfer Sekarang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
