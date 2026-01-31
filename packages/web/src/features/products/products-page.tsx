import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/api/endpoints/products.api';
import { categoriesApi } from '@/api/endpoints/categories.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { CategoryManager } from './components/category-manager';
import { InlineHelpCard, HelpSidebar } from '@/components/shared/help-sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';
import { Plus, MoreHorizontal, Pencil, Trash2, Tags } from 'lucide-react';
import type { Product } from '@/types/product.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

export function ProductsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', search, categoryFilter],
    queryFn: () =>
      productsApi.list({
        search: search || undefined,
        categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Produk dihapus' });
      setDeleteTarget(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal menghapus',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const columns: Column<Product>[] = [
    {
      key: 'image',
      header: '',
      cell: (row) =>
        row.imageUrl ? (
          <img src={row.imageUrl} alt={row.name} className="h-10 w-10 rounded-md object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
            N/A
          </div>
        ),
    },
    { key: 'name', header: 'Nama', cell: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'sku', header: 'SKU', cell: (row) => <span className="text-muted-foreground">{row.sku}</span> },
    { key: 'price', header: 'Harga', cell: (row) => formatCurrency(row.basePrice) },
    {
      key: 'category',
      header: 'Kategori',
      cell: (row) =>
        row.category ? <Badge variant="secondary">{row.category.name}</Badge> : <span className="text-muted-foreground">-</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) =>
        row.isActive ? (
          <Badge variant="default">Aktif</Badge>
        ) : (
          <Badge variant="outline">Nonaktif</Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/app/products/${row.id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteTarget(row)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Produk" description="Kelola daftar produk Anda">
        <HelpSidebar page="products" />
        <Button variant="outline" onClick={() => setCategoryManagerOpen(true)}>
          <Tags className="mr-2 h-4 w-4" /> Kategori
        </Button>
        <Button onClick={() => navigate('/app/products/new')}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Produk
        </Button>
      </PageHeader>

      <InlineHelpCard page="products" className="mb-4" />

      <DataTable
        columns={columns}
        data={productsData ?? []}
        isLoading={isLoading}
        searchPlaceholder="Cari produk..."
        onSearch={setSearch}
        emptyTitle="Belum ada produk"
        emptyDescription="Tambahkan produk pertama Anda."
        filters={
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Produk"
        description={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />

      <CategoryManager open={categoryManagerOpen} onOpenChange={setCategoryManagerOpen} />
    </div>
  );
}
