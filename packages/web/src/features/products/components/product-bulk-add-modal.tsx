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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/lib/toast-utils';
import { Loader2, Plus, Trash2, FileStack } from 'lucide-react';
import type { CreateProductRequest } from '@/types/product.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

interface ProductBulkAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BulkProductRow {
  id: string;
  name: string;
  price: string;
  categoryId: string;
}

function generateId() {
  return `row-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function createEmptyRow(): BulkProductRow {
  return { id: generateId(), name: '', price: '', categoryId: '' };
}

/**
 * Bulk Add Modal - Tambah beberapa produk sekaligus dalam bentuk tabel
 * Cocok untuk 5-20 produk tanpa perlu Excel
 */
export function ProductBulkAddModal({ open, onOpenChange }: ProductBulkAddModalProps) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<BulkProductRow[]>([
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
  ]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (products: CreateProductRequest[]) => {
      const results = await Promise.allSettled(
        products.map((p) => productsApi.create(p)),
      );
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      if (successful > 0) {
        toast.success({
          title: `✅ ${successful} produk berhasil ditambahkan!`,
          description: failed > 0 ? `${failed} produk gagal ditambahkan` : undefined,
        });
      }

      if (failed === 0) {
        // Reset form if all successful
        setRows([
          createEmptyRow(),
          createEmptyRow(),
          createEmptyRow(),
          createEmptyRow(),
          createEmptyRow(),
        ]);
        onOpenChange(false);
      } else {
        // Keep only failed rows
        const failedIndices = results
          .map((r, i) => (r.status === 'rejected' ? i : -1))
          .filter((i) => i !== -1);

        setRows((prev) => failedIndices.map((i) => prev[i]));

        toast.error({
          title: 'Beberapa produk gagal',
          description: 'Periksa kembali data yang gagal dan coba lagi',
        });
      }
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menambahkan produk',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const updateRow = (id: string, field: keyof BulkProductRow, value: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) {
      toast.error({ title: 'Minimal 1 baris diperlukan' });
      return;
    }
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleSubmit = () => {
    // Filter rows with at least name filled
    const validRows = rows.filter((row) => row.name.trim());

    if (validRows.length === 0) {
      toast.error({ title: 'Isi minimal 1 produk' });
      return;
    }

    // Validate prices
    const invalidPrices = validRows.filter(
      (row) => !row.price || Number(row.price) <= 0,
    );
    if (invalidPrices.length > 0) {
      toast.error({
        title: 'Harga tidak valid',
        description: `${invalidPrices.length} produk memiliki harga yang tidak valid`,
      });
      return;
    }

    // Convert to CreateProductRequest
    const products: CreateProductRequest[] = validRows.map((row) => {
      const sku =
        row.name
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .substring(0, 10) +
        '-' +
        Date.now().toString(36).toUpperCase();

      return {
        name: row.name.trim(),
        sku,
        basePrice: Number(row.price),
        costPrice: 0,
        trackStock: true,
        categoryId: row.categoryId && row.categoryId !== '__none__' ? row.categoryId : undefined,
      };
    });

    bulkCreateMutation.mutate(products);
  };

  const filledRowsCount = rows.filter((row) => row.name.trim()).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileStack className="h-5 w-5 text-blue-500" />
            Tambah Produk Bulk
          </DialogTitle>
          <DialogDescription>
            Isi beberapa produk sekaligus. Nama dan harga wajib diisi. SKU akan digenerate otomatis.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead className="min-w-[200px]">Nama Produk *</TableHead>
                <TableHead className="w-[150px]">Harga *</TableHead>
                <TableHead className="w-[180px]">Kategori</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="cth: Kopi Latte"
                      value={row.name}
                      onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                      disabled={bulkCreateMutation.isPending}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="25000"
                      value={row.price}
                      onChange={(e) => updateRow(row.id, 'price', e.target.value)}
                      disabled={bulkCreateMutation.isPending}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.categoryId}
                      onValueChange={(value) => updateRow(row.id, 'categoryId', value)}
                      disabled={bulkCreateMutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih..." />
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
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length <= 1 || bulkCreateMutation.isPending}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              disabled={bulkCreateMutation.isPending}
            >
              <Plus className="mr-1 h-4 w-4" /> Tambah Baris
            </Button>
            <span className="text-xs text-muted-foreground">
              {filledRowsCount} produk siap ditambahkan
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={bulkCreateMutation.isPending}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={bulkCreateMutation.isPending || filledRowsCount === 0}
          >
            {bulkCreateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {bulkCreateMutation.isPending
              ? 'Menyimpan...'
              : `Tambah ${filledRowsCount} Produk`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
