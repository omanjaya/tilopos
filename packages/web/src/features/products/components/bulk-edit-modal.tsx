import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/api/endpoints/products.api';
import { categoriesApi } from '@/api/endpoints/categories.api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
import { Loader2, Edit } from 'lucide-react';
import type { Product, BulkUpdateProductsRequest } from '@/types/product.types';

interface BulkEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: Product[];
  onComplete: () => void;
}

type EditAction = 'category' | 'price' | 'costPrice' | 'status' | 'trackStock' | 'delete';

export function BulkEditModal({
  open,
  onOpenChange,
  selectedProducts,
  onComplete,
}: BulkEditModalProps) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<EditAction>('category');

  // Category action
  const [newCategoryId, setNewCategoryId] = useState<string>('');

  // Price action
  const [priceOperation, setPriceOperation] = useState<'increase' | 'decrease'>('increase');
  const [priceType, setPriceType] = useState<'percentage' | 'fixed'>('percentage');
  const [priceValue, setPriceValue] = useState('');

  // Cost price action
  const [costPriceOperation, setCostPriceOperation] = useState<'increase' | 'decrease'>('increase');
  const [costPriceType, setCostPriceType] = useState<'percentage' | 'fixed'>('percentage');
  const [costPriceValue, setCostPriceValue] = useState('');

  // Status action
  const [newStatus, setNewStatus] = useState<'active' | 'inactive'>('active');

  // Track stock action
  const [newTrackStock, setNewTrackStock] = useState<'true' | 'false'>('true');

  // Delete action
  const [hardDelete, setHardDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const bulkMutation = useMutation({
    mutationFn: async () => {
      if (action === 'delete') {
        return productsApi.bulkDelete({
          productIds: selectedProducts.map((p) => p.id),
          hardDelete,
        });
      }

      const payload: BulkUpdateProductsRequest = {
        productIds: selectedProducts.map((p) => p.id),
        action: action as BulkUpdateProductsRequest['action'],
      };

      switch (action) {
        case 'category':
          payload.categoryId = newCategoryId === '__none__' ? null : newCategoryId;
          break;
        case 'price':
          payload.operation = priceOperation;
          payload.priceType = priceType;
          payload.value = Number(priceValue);
          break;
        case 'costPrice':
          payload.operation = costPriceOperation;
          payload.priceType = costPriceType;
          payload.value = Number(costPriceValue);
          break;
        case 'status':
          payload.isActive = newStatus === 'active';
          break;
        case 'trackStock':
          payload.trackStock = newTrackStock === 'true';
          break;
      }

      return productsApi.bulkUpdate(payload);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['pos'] });

      if ('deleted' in result) {
        toast.success({
          title: `${result.deleted} produk berhasil dihapus`,
        });
      } else {
        toast.success({
          title: `${result.updated} produk berhasil diupdate`,
          description: result.failed > 0 ? `${result.failed} produk gagal diupdate` : undefined,
        });
      }

      onComplete();
      onOpenChange(false);
    },
    onError: (error) => handleMutationError(error, action === 'delete' ? 'Gagal menghapus produk' : 'Gagal mengupdate produk'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (action === 'category' && !newCategoryId) {
      toast.error({ title: 'Pilih kategori baru' });
      return;
    }

    if (action === 'price' && (!priceValue || Number(priceValue) <= 0)) {
      toast.error({ title: 'Masukkan nilai harga yang valid' });
      return;
    }

    if (action === 'costPrice' && (!costPriceValue || Number(costPriceValue) <= 0)) {
      toast.error({ title: 'Masukkan nilai HPP yang valid' });
      return;
    }

    if (action === 'delete' && hardDelete && deleteConfirmText !== 'HAPUS') {
      toast.error({ title: 'Ketik "HAPUS" untuk konfirmasi penghapusan permanen' });
      return;
    }

    bulkMutation.mutate();
  };

  const getSummaryText = () => {
    const count = selectedProducts.length;
    switch (action) {
      case 'category':
        return `Ubah kategori ${count} produk`;
      case 'price':
        return `${priceOperation === 'increase' ? 'Naikkan' : 'Turunkan'} harga ${count} produk sebesar ${priceValue || '...'}${priceType === 'percentage' ? '%' : ' Rp'}`;
      case 'costPrice':
        return `${costPriceOperation === 'increase' ? 'Naikkan' : 'Turunkan'} HPP ${count} produk sebesar ${costPriceValue || '...'}${costPriceType === 'percentage' ? '%' : ' Rp'}`;
      case 'status':
        return `${newStatus === 'active' ? 'Aktifkan' : 'Nonaktifkan'} ${count} produk`;
      case 'trackStock':
        return `${newTrackStock === 'true' ? 'Aktifkan' : 'Nonaktifkan'} pelacakan stok ${count} produk`;
      case 'delete':
        return `Hapus ${count} produk${hardDelete ? ' secara permanen' : ''}`;
    }
  };

  const priceExample = (base: number, op: 'increase' | 'decrease', type: 'percentage' | 'fixed', val: string) => {
    const v = Number(val);
    if (!v || v <= 0) return null;
    const result = Math.round(
      type === 'percentage'
        ? base * (op === 'increase' ? 1 + v / 100 : 1 - v / 100)
        : op === 'increase'
          ? base + v
          : base - v,
    );
    return Math.max(0, result).toLocaleString('id-ID');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Bulk Edit - {selectedProducts.length} Produk
          </DialogTitle>
          <DialogDescription>
            Pilih aksi yang ingin diterapkan ke semua produk yang dipilih
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Action Selector */}
          <div className="space-y-3">
            <Label>Pilih Aksi</Label>
            <RadioGroup value={action} onValueChange={(value) => setAction(value as EditAction)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="category" id="category" />
                <Label htmlFor="category" className="font-normal cursor-pointer">
                  Ubah Kategori
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="price" id="price" />
                <Label htmlFor="price" className="font-normal cursor-pointer">
                  Ubah Harga
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="costPrice" id="costPrice" />
                <Label htmlFor="costPrice" className="font-normal cursor-pointer">
                  Ubah Harga Pokok (HPP)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="status" id="status" />
                <Label htmlFor="status" className="font-normal cursor-pointer">
                  Ubah Status Aktif/Nonaktif
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="trackStock" id="trackStock" />
                <Label htmlFor="trackStock" className="font-normal cursor-pointer">
                  Ubah Pelacakan Stok
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="delete" id="delete" />
                <Label htmlFor="delete" className="font-normal cursor-pointer text-destructive">
                  Hapus Produk
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Category Action */}
          {action === 'category' && (
            <div className="space-y-2">
              <Label>Kategori Baru</Label>
              <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Tanpa kategori</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Price Action */}
          {action === 'price' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Operasi</Label>
                  <Select value={priceOperation} onValueChange={(v) => setPriceOperation(v as 'increase' | 'decrease')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase">Naikkan</SelectItem>
                      <SelectItem value="decrease">Turunkan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipe</Label>
                  <Select value={priceType} onValueChange={(v) => setPriceType(v as 'percentage' | 'fixed')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Persentase (%)</SelectItem>
                      <SelectItem value="fixed">Nominal (Rp)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nilai</Label>
                <Input
                  type="number"
                  placeholder={priceType === 'percentage' ? '10' : '5000'}
                  value={priceValue}
                  onChange={(e) => setPriceValue(e.target.value)}
                />
                {priceExample(25000, priceOperation, priceType, priceValue) && (
                  <p className="text-xs text-muted-foreground">
                    Contoh: Rp 25.000 → Rp {priceExample(25000, priceOperation, priceType, priceValue)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Cost Price Action */}
          {action === 'costPrice' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Operasi</Label>
                  <Select value={costPriceOperation} onValueChange={(v) => setCostPriceOperation(v as 'increase' | 'decrease')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase">Naikkan</SelectItem>
                      <SelectItem value="decrease">Turunkan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipe</Label>
                  <Select value={costPriceType} onValueChange={(v) => setCostPriceType(v as 'percentage' | 'fixed')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Persentase (%)</SelectItem>
                      <SelectItem value="fixed">Nominal (Rp)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nilai</Label>
                <Input
                  type="number"
                  placeholder={costPriceType === 'percentage' ? '10' : '5000'}
                  value={costPriceValue}
                  onChange={(e) => setCostPriceValue(e.target.value)}
                />
                {priceExample(15000, costPriceOperation, costPriceType, costPriceValue) && (
                  <p className="text-xs text-muted-foreground">
                    Contoh: Rp 15.000 → Rp {priceExample(15000, costPriceOperation, costPriceType, costPriceValue)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Status Action */}
          {action === 'status' && (
            <div className="space-y-2">
              <Label>Status Baru</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as 'active' | 'inactive')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktifkan Semua</SelectItem>
                  <SelectItem value="inactive">Nonaktifkan Semua</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedProducts.filter((p) => p.isActive).length} produk aktif, {selectedProducts.filter((p) => !p.isActive).length} produk nonaktif dipilih
              </p>
            </div>
          )}

          {/* Track Stock Action */}
          {action === 'trackStock' && (
            <div className="space-y-2">
              <Label>Pelacakan Stok</Label>
              <Select value={newTrackStock} onValueChange={(v) => setNewTrackStock(v as 'true' | 'false')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Aktifkan Pelacakan Stok</SelectItem>
                  <SelectItem value="false">Nonaktifkan Pelacakan Stok</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedProducts.filter((p) => p.trackStock).length} produk dengan stok aktif, {selectedProducts.filter((p) => !p.trackStock).length} tanpa pelacakan stok
              </p>
            </div>
          )}

          {/* Delete Action */}
          {action === 'delete' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm">
                <p className="font-medium text-destructive">Peringatan!</p>
                <p className="mt-1 text-muted-foreground">
                  {selectedProducts.length} produk akan dihapus. Secara default, produk akan dinonaktifkan (soft delete).
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={hardDelete}
                  onCheckedChange={(v) => {
                    setHardDelete(!!v);
                    setDeleteConfirmText('');
                  }}
                  id="hardDelete"
                />
                <Label htmlFor="hardDelete" className="font-normal cursor-pointer text-sm text-muted-foreground">
                  Hapus permanen (tidak bisa dikembalikan)
                </Label>
              </div>
              {hardDelete && (
                <div className="space-y-2">
                  <Label>Ketik &quot;HAPUS&quot; untuk konfirmasi</Label>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="HAPUS"
                  />
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium mb-1">Ringkasan:</p>
            <p className="text-muted-foreground">{getSummaryText()}</p>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={bulkMutation.isPending}
          >
            Batal
          </Button>
          {action === 'delete' ? (
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={bulkMutation.isPending}
            >
              {bulkMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {bulkMutation.isPending ? 'Menghapus...' : `Hapus ${selectedProducts.length} Produk`}
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={bulkMutation.isPending}
            >
              {bulkMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {bulkMutation.isPending ? 'Mengupdate...' : `Update ${selectedProducts.length} Produk`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
