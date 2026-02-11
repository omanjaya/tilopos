import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/api/endpoints/products.api';
import { categoriesApi } from '@/api/endpoints/categories.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { CategoryManager } from './components/category-manager';
import { ProductQuickAddModal } from './components/product-quick-add-modal';
import { ProductBulkAddModal } from './components/product-bulk-add-modal';
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
import { formatCurrency } from '@/lib/format';
import { toast } from '@/lib/toast-utils';
import { useBusinessFeatures } from '@/hooks/use-business-features';
import { Plus, MoreHorizontal, Pencil, Trash2, Tags, Barcode, Zap, FileSpreadsheet, FileStack, Copy } from 'lucide-react';
import type { Product } from '@/types/product.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

export function ProductsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);

  // Feature checks for dynamic UI
  const { hasBarcodeScanning } = useBusinessFeatures();

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
      toast.success({
        title: 'Produk berhasil dihapus',
        description: `"${deleteTarget?.name}" telah dihapus dari daftar produk`,
      });
      setDeleteTarget(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menghapus produk',
        description: error.response?.data?.message || 'Terjadi kesalahan saat menghapus produk',
      });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (product: Product) => {
      const duplicatedData = {
        name: `${product.name} (Copy)`,
        sku: `${product.sku}-COPY-${Date.now().toString(36).toUpperCase()}`,
        description: product.description,
        categoryId: product.categoryId,
        basePrice: product.basePrice,
        costPrice: product.costPrice,
        trackStock: product.trackStock,
        imageUrl: product.imageUrl,
      };
      return productsApi.create(duplicatedData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success({
        title: '✅ Produk berhasil diduplikasi!',
        description: `"${data.name}" telah ditambahkan`,
      });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menduplikasi produk',
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
    {
      key: 'sku',
      header: hasBarcodeScanning ? (
        <span className="flex items-center gap-1">
          <Barcode className="h-3.5 w-3.5" /> SKU
        </span>
      ) : 'SKU',
      cell: (row) => <span className="text-muted-foreground font-mono text-sm">{row.sku}</span>
    },
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
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Aksi produk">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/app/products/${row.id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => duplicateMutation.mutate(row)}>
              <Copy className="mr-2 h-4 w-4" /> Duplikasi
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

  // Keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // N - New product (full form)
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        navigate('/app/products/new');
      }

      // Q - Quick add product
      if (e.key === 'q' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setQuickAddOpen(true);
      }

      // B - Bulk add product
      if (e.key === 'b' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setBulkAddOpen(true);
      }

      // / - Focus search
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate, setQuickAddOpen, setBulkAddOpen]);

  return (
    <div>
      <PageHeader title="Produk" description="Kelola daftar produk Anda">
        <HelpSidebar page="products" />
        <Button variant="outline" onClick={() => setCategoryManagerOpen(true)}>
          <Tags className="mr-2 h-4 w-4" /> Kategori
        </Button>
        <Button variant="outline" onClick={() => navigate('/app/import?type=products')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Import Excel
        </Button>
        <Button variant="outline" onClick={() => setBulkAddOpen(true)} aria-keyshortcuts="B">
          <FileStack className="mr-2 h-4 w-4" /> Bulk Add
        </Button>
        <Button variant="outline" onClick={() => setQuickAddOpen(true)} aria-keyshortcuts="Q">
          <Zap className="mr-2 h-4 w-4" /> Quick Add
        </Button>
        <Button onClick={() => navigate('/app/products/new')} aria-keyshortcuts="N">
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
        emptyDescription="Mulai dengan menambahkan produk pertama Anda untuk mulai berjualan."
        emptyAction={
          <div className="flex flex-col gap-3 items-center">
            <div className="flex gap-2">
              <Button onClick={() => setQuickAddOpen(true)}>
                <Zap className="mr-2 h-4 w-4" /> Quick Add
              </Button>
              <Button variant="outline" onClick={() => setBulkAddOpen(true)}>
                <FileStack className="mr-2 h-4 w-4" /> Bulk Add
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/app/import?type=products')}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Import Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/app/products/new')}>
                <Plus className="mr-2 h-4 w-4" /> Form Lengkap
              </Button>
            </div>
          </div>
        }
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
      <ProductQuickAddModal open={quickAddOpen} onOpenChange={setQuickAddOpen} />
      <ProductBulkAddModal open={bulkAddOpen} onOpenChange={setBulkAddOpen} />
    </div>
  );
}
