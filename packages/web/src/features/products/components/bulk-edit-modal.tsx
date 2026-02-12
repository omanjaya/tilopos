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
import { Loader2, Edit } from 'lucide-react';
import type { Product, UpdateProductRequest } from '@/types/product.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

interface BulkEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: Product[];
  onComplete: () => void;
}

type EditAction = 'category' | 'price' | 'status';

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

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async () => {
      const updates = selectedProducts.map(async (product) => {
        let updateData: UpdateProductRequest = {};

        switch (action) {
          case 'category':
            updateData = { categoryId: newCategoryId === '__none__' ? undefined : newCategoryId };
            break;

          case 'price': {
            const value = Number(priceValue);
            let newPrice = product.basePrice;

            if (priceType === 'percentage') {
              const change = (product.basePrice * value) / 100;
              newPrice = priceOperation === 'increase'
                ? product.basePrice + change
                : product.basePrice - change;
            } else {
              newPrice = priceOperation === 'increase'
                ? product.basePrice + value
                : product.basePrice - value;
            }

            // Ensure price doesn't go below 0
            newPrice = Math.max(0, Math.round(newPrice));
            updateData = { basePrice: newPrice };
            break;
          }

          case 'status':
            updateData = { isActive: !product.isActive };
            break;
        }

        return productsApi.update(product.id, updateData);
      });

      return Promise.allSettled(updates);
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      if (successful > 0) {
        toast.success({
          title: `✅ ${successful} produk berhasil diupdate!`,
          description: failed > 0 ? `${failed} produk gagal diupdate` : undefined,
        });
      }

      if (failed === 0) {
        onComplete();
        onOpenChange(false);
      }
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal mengupdate produk',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    if (action === 'category' && !newCategoryId) {
      toast.error({ title: 'Pilih kategori baru' });
      return;
    }

    if (action === 'price' && (!priceValue || Number(priceValue) <= 0)) {
      toast.error({ title: 'Masukkan nilai harga yang valid' });
      return;
    }

    bulkUpdateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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
                <RadioGroupItem value="status" id="status" />
                <Label htmlFor="status" className="font-normal cursor-pointer">
                  Toggle Status Aktif/Nonaktif
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
                {priceValue && Number(priceValue) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Contoh: Rp 25,000 → Rp{' '}
                    {Math.round(
                      priceType === 'percentage'
                        ? 25000 * (priceOperation === 'increase' ? 1 + Number(priceValue) / 100 : 1 - Number(priceValue) / 100)
                        : priceOperation === 'increase'
                          ? 25000 + Number(priceValue)
                          : 25000 - Number(priceValue),
                    ).toLocaleString('id-ID')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Status Action Info */}
          {action === 'status' && (
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
              Status produk yang dipilih akan di-toggle:
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Produk aktif → akan dinonaktifkan</li>
                <li>Produk nonaktif → akan diaktifkan</li>
              </ul>
            </div>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={bulkUpdateMutation.isPending}
          >
            Batal
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={bulkUpdateMutation.isPending}
          >
            {bulkUpdateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {bulkUpdateMutation.isPending ? 'Mengupdate...' : `Update ${selectedProducts.length} Produk`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
