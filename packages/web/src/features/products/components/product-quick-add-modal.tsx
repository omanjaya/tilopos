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
import { toast } from '@/lib/toast-utils';
import { Loader2, Zap } from 'lucide-react';
import type { CreateProductRequest } from '@/types/product.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

interface ProductQuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Quick Add Modal - Tambah produk simple tanpa ribet
 * Hanya field wajib: nama + harga
 */
export function ProductQuickAddModal({ open, onOpenChange }: ProductQuickAddModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateProductRequest) => productsApi.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success({
        title: '✅ Produk berhasil ditambahkan!',
        description: `"${data.name}" - Rp ${data.basePrice.toLocaleString('id-ID')}`,
      });
      // Reset form
      setName('');
      setBasePrice('');
      setCategoryId('');
      onOpenChange(false);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menambahkan produk',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error({ title: 'Nama produk wajib diisi' });
      return;
    }

    if (!basePrice || Number(basePrice) <= 0) {
      toast.error({ title: 'Harga harus lebih dari 0' });
      return;
    }

    // Generate simple SKU from name
    const sku = name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 10) + '-' + Date.now().toString(36).toUpperCase();

    createMutation.mutate({
      name: name.trim(),
      sku,
      basePrice: Number(basePrice),
      costPrice: 0,
      trackStock: true,
      categoryId: categoryId || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Tambah Produk Cepat
          </DialogTitle>
          <DialogDescription>
            Isi nama dan harga, langsung jadi! Bisa edit detail nanti.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Nama Produk */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-1">
              Nama Produk <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="cth: Kopi Latte"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={createMutation.isPending}
            />
          </div>

          {/* Harga */}
          <div className="space-y-2">
            <Label htmlFor="basePrice" className="flex items-center gap-1">
              Harga Jual <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                Rp
              </span>
              <Input
                id="basePrice"
                type="number"
                placeholder="25000"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="pl-12"
                disabled={createMutation.isPending}
              />
            </div>
            {basePrice && Number(basePrice) > 0 && (
              <p className="text-xs text-muted-foreground">
                = Rp {Number(basePrice).toLocaleString('id-ID')}
              </p>
            )}
          </div>

          {/* Kategori (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="categoryId">Kategori (opsional)</Label>
            <Select
              value={categoryId}
              onValueChange={setCategoryId}
              disabled={createMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tanpa kategori</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
          >
            Batal
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {createMutation.isPending ? 'Menyimpan...' : 'Tambah Produk'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
