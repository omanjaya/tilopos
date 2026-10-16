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
import { toast } from '@/lib/toast-utils';
import { formatCurrency } from '@/lib/format';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { handleMutationError } from '@/lib/api-error-handler';

interface POItemForm {
  productId: string;
  itemName: string;
  quantityOrdered: number;
  unitCost: number;
}

interface PurchaseOrderFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Creates a draft PO via POST /suppliers/purchase-orders (items: itemName, quantityOrdered, unitCost). */
export function PurchaseOrderFormModal({ open, onOpenChange }: PurchaseOrderFormModalProps) {
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState('');
  const [outletId, setOutletId] = useState('');
  const [items, setItems] = useState<POItemForm[]>([]);

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => inventoryApi.listSuppliers(),
    enabled: open,
  });

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

  const resetForm = () => {
    setSupplierId('');
    setOutletId('');
    setItems([]);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      inventoryApi.createPurchaseOrder({
        supplierId,
        outletId,
        items: items.map((i) => ({
          productId: i.productId,
          itemName: i.itemName,
          quantityOrdered: i.quantityOrdered,
          unitCost: i.unitCost,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success({ title: 'Purchase order dibuat', description: 'PO tersimpan sebagai draf.' });
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => handleMutationError(error, 'Gagal membuat purchase order'),
  });

  const updateItem = (index: number, patch: Partial<POItemForm>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const selectProduct = (index: number, productId: string) => {
    const product = products?.find((p) => p.id === productId);
    updateItem(index, {
      productId,
      itemName: product?.name ?? '',
      unitCost: Number(product?.costPrice ?? 0),
    });
  };

  const total = items.reduce((sum, i) => sum + i.quantityOrdered * i.unitCost, 0);

  const isValid =
    !!supplierId &&
    !!outletId &&
    items.length > 0 &&
    items.every((i) => i.productId && i.quantityOrdered > 0 && i.unitCost >= 0);

  const activeOutlets = outlets?.filter((o) => o.isActive) ?? [];
  const activeSuppliers = suppliers?.filter((s) => s.isActive !== false) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat Purchase Order</DialogTitle>
          <DialogDescription>
            PO baru disimpan sebagai draf dan perlu disetujui sebelum barang dapat diterima.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="po-supplier">Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger id="po-supplier">
                  <SelectValue placeholder="Pilih supplier" />
                </SelectTrigger>
                <SelectContent>
                  {activeSuppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="po-outlet">Outlet Tujuan</Label>
              <Select value={outletId} onValueChange={setOutletId}>
                <SelectTrigger id="po-outlet">
                  <SelectValue placeholder="Pilih outlet" />
                </SelectTrigger>
                <SelectContent>
                  {activeOutlets.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Item</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setItems((prev) => [...prev, { productId: '', itemName: '', quantityOrdered: 1, unitCost: 0 }])
                }
              >
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
                    <Select value={item.productId} onValueChange={(v) => selectProduct(index, v)}>
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
                  <div className="w-20 space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantityOrdered}
                      onChange={(e) => updateItem(index, { quantityOrdered: Number(e.target.value) })}
                    />
                  </div>
                  <div className="w-32 space-y-1">
                    <Label className="text-xs">Harga Satuan</Label>
                    <Input
                      type="number"
                      min="0"
                      value={item.unitCost}
                      onChange={(e) => updateItem(index, { unitCost: Number(e.target.value) })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive"
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                    aria-label={`Hapus item ${item.itemName || index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {items.length > 0 && (
            <p className="text-right text-sm">
              Perkiraan total: <span className="font-semibold">{formatCurrency(total)}</span>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button disabled={!isValid || createMutation.isPending} onClick={() => createMutation.mutate()}>
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Draf
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
