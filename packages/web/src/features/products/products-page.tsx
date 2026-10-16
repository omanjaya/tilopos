import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { productsApi, type ProductStatusFilter } from '@/api/endpoints/products.api';
import { categoriesApi } from '@/api/endpoints/categories.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ErrorState } from '@/components/shared/error-state';
import { hasRole } from '@/config/permissions';
import { CategoryManager } from './components/category-manager';
import { ProductQuickAddModal } from './components/product-quick-add-modal';
import { ProductBulkAddModal } from './components/product-bulk-add-modal';
import { BulkEditModal } from './components/bulk-edit-modal';
import { ProductTemplatesModal } from './components/product-templates-modal';
import { BarcodePrintModal } from './components/barcode-generator';
import { InlineHelpCard, HelpSidebar } from '@/components/shared/help-sidebar';
import { Checkbox } from '@/components/ui/checkbox';
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
import { handleMutationError } from '@/lib/api-error-handler';
import { usePaginatedList } from '@/hooks/use-paginated-list';
import { useOptimisticDelete } from '@/hooks/use-optimistic-delete';
import { useRowHighlight } from '@/hooks/use-row-highlight';
import { useBusinessFeatures } from '@/hooks/use-business-features';
import { Plus, MoreHorizontal, Pencil, Trash2, Tags, Barcode, Zap, FileSpreadsheet, FileStack, Copy, Edit2, LayoutTemplate, Printer, RotateCcw } from 'lucide-react';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import type { Product } from '@/types/product.types';

export function ProductsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const user = useAuthStore((s) => s.user);
  const outletId = selectedOutletId ?? user?.outletId ?? '';
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('active');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [barcodePrintOpen, setBarcodePrintOpen] = useState(false);

  // Mirrors backend @Roles on /inventory/products*: create/update/bulk-update/import =
  // MANAGER/OWNER/INVENTORY; delete, bulk delete and category CRUD = MANAGER/OWNER.
  const canWrite = hasRole(user?.role, 'STOCK');
  const canDelete = hasRole(user?.role, 'MANAGEMENT');

  const { highlightedRowId, highlightRow } = useRowHighlight();

  // Feature checks for dynamic UI
  const { hasBarcodeScanning } = useBusinessFeatures();

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const filters = useMemo(() => ({
    outletId: outletId || undefined,
    categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
    // Only catalogue writers may list inactive products (backend forces active for others)
    status: canWrite ? statusFilter : undefined,
  }), [outletId, categoryFilter, statusFilter, canWrite]);

  const { data: productsData, isLoading, error, refetch, pagination, sort, setSearch } = usePaginatedList<Product>({
    queryKey: ['products'],
    queryFn: (params) => productsApi.listPaginated({ ...params, ...filters }),
    filters,
    defaultLimit: 15,
  });

  const deleteMutation = useOptimisticDelete({
    queryKey: ['products'],
    deleteFn: (id) => productsApi.delete(id),
    successMessage: 'Produk berhasil dihapus',
    errorMessage: 'Gagal menghapus produk',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos'] });
      setDeleteTarget(null);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (product: Product) => {
      const duplicatedData = {
        name: `${product.name} (Salinan)`,
        sku: `${product.sku}-COPY-${Date.now().toString(36).toUpperCase()}`,
        description: product.description ?? undefined,
        categoryId: product.categoryId ?? undefined,
        basePrice: Number(product.basePrice) || 0,
        costPrice: Number(product.costPrice) || 0,
        trackStock: product.trackStock,
        imageUrl: product.imageUrl ?? undefined,
        // Copy active variants too (SKUs are unique, so leave them empty on the copy)
        variants: (product.variants ?? [])
          .filter((v) => v.isActive !== false)
          .map((v) => ({ name: v.name, price: Number(v.price) || 0, costPrice: Number(v.costPrice) || 0 })),
      };
      return productsApi.create(duplicatedData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['pos'] });
      highlightRow(data.id);
      toast.success({
        title: 'Produk berhasil diduplikasi',
        description: `"${data.name}" telah ditambahkan`,
      });
    },
    onError: (error) => handleMutationError(error, 'Gagal menduplikasi produk'),
  });

  const reactivateMutation = useMutation({
    mutationFn: (product: Product) => productsApi.update(product.id, { isActive: true }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['pos'] });
      toast.success({ title: 'Produk diaktifkan kembali', description: `"${data.name}" kembali aktif` });
    },
    onError: (error) => handleMutationError(error, 'Gagal mengaktifkan produk'),
  });

  const isAllSelected = Boolean(productsData && productsData.length > 0 && selectedProducts.length === productsData.length);
  const isSomeSelected = selectedProducts.length > 0 && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(productsData || []);
    }
  };

  const toggleSelectProduct = (product: Product) => {
    setSelectedProducts((prev) =>
      prev.find((p) => p.id === product.id)
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, product],
    );
  };

  const columns: Column<Product>[] = [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={isAllSelected}
          indeterminate={isSomeSelected}
          onCheckedChange={toggleSelectAll}
          aria-label="Pilih semua produk"
        />
      ),
      cell: (row) => (
        <Checkbox
          checked={selectedProducts.some((p) => p.id === row.id)}
          onCheckedChange={() => toggleSelectProduct(row)}
          aria-label={`Pilih ${row.name}`}
        />
      ),
    },
    {
      key: 'image',
      header: '',
      cell: (row) =>
        row.imageUrl ? (
          <img src={row.imageUrl} alt={row.name} loading="lazy" className="h-10 w-10 rounded-md object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
            N/A
          </div>
        ),
    },
    { key: 'name', header: 'Nama', sortable: true, cell: (row) => <span className="font-medium">{row.name}</span> },
    {
      key: 'sku',
      header: hasBarcodeScanning ? (
        <span className="flex items-center gap-1">
          <Barcode className="h-3.5 w-3.5" /> SKU
        </span>
      ) : 'SKU',
      cell: (row) => <span className="text-muted-foreground font-mono text-sm">{row.sku}</span>
    },
    { key: 'basePrice', header: 'Harga', sortable: true, cell: (row) => formatCurrency(row.basePrice) },
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
      cell: (row) => !canWrite ? null : (
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
            {!row.isActive && (
              <DropdownMenuItem
                onClick={() => reactivateMutation.mutate(row)}
                disabled={reactivateMutation.isPending}
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Aktifkan Kembali
              </DropdownMenuItem>
            )}
            {canDelete && row.isActive && (
              <DropdownMenuItem
                onClick={() => setDeleteTarget(row)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Hapus
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Produk" description="Kelola daftar produk Anda">
        <HelpSidebar page="products" />
        {selectedProducts.length > 0 && (
          <>
            <Button
              variant="outline"
              onClick={() => setBarcodePrintOpen(true)}
              disabled={!selectedProducts.some((p) => p.sku)}
            >
              <Printer className="mr-2 h-4 w-4" /> Cetak Barcode ({selectedProducts.filter((p) => p.sku).length})
            </Button>
            {canWrite && (
              <Button
                variant="default"
                onClick={() => setBulkEditOpen(true)}
              >
                <Edit2 className="mr-2 h-4 w-4" /> Ubah Massal ({selectedProducts.length})
              </Button>
            )}
          </>
        )}
        {canDelete && (
          <Button variant="outline" onClick={() => setCategoryManagerOpen(true)}>
            <Tags className="mr-2 h-4 w-4" /> Kategori
          </Button>
        )}
        {canWrite && (
          <>
            <Button variant="outline" onClick={() => setTemplatesOpen(true)}>
              <LayoutTemplate className="mr-2 h-4 w-4" /> Templat
            </Button>
            <Button variant="outline" onClick={() => navigate('/app/import?type=products')}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Impor Excel
            </Button>
            <Button variant="outline" onClick={() => setBulkAddOpen(true)} aria-keyshortcuts="B">
              <FileStack className="mr-2 h-4 w-4" /> Tambah Massal
            </Button>
            <Button variant="outline" onClick={() => setQuickAddOpen(true)} aria-keyshortcuts="Q">
              <Zap className="mr-2 h-4 w-4" /> Tambah Cepat
            </Button>
            <Button onClick={() => navigate('/app/products/new')} aria-keyshortcuts="N">
              <Plus className="mr-2 h-4 w-4" /> Tambah Produk
            </Button>
          </>
        )}
      </PageHeader>

      <InlineHelpCard page="products" className="mb-4" />

      {error ? (
        <ErrorState title="Gagal memuat produk" error={error} onRetry={() => refetch()} />
      ) : (
      <DataTable
        columns={columns}
        data={productsData}
        isLoading={isLoading}
        searchPlaceholder="Cari produk..."
        onSearch={setSearch}
        pagination={pagination}
        sort={sort}
        highlightedRowId={highlightedRowId}
        rowId={(row) => row.id}
        emptyTitle="Belum ada produk"
        emptyDescription="Mulai dengan menambahkan produk pertama Anda untuk mulai berjualan."
        emptyAction={
          !canWrite ? undefined :
          <div className="flex flex-col gap-3 items-center">
            <Button onClick={() => setTemplatesOpen(true)}>
              <LayoutTemplate className="mr-2 h-4 w-4" /> Gunakan Template
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setQuickAddOpen(true)}>
                <Zap className="mr-2 h-4 w-4" /> Tambah Cepat
              </Button>
              <Button variant="outline" size="sm" onClick={() => setBulkAddOpen(true)}>
                <FileStack className="mr-2 h-4 w-4" /> Tambah Massal
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/app/import?type=products')}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Impor Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/app/products/new')}>
                <Plus className="mr-2 h-4 w-4" /> Form Lengkap
              </Button>
            </div>
          </div>
        }
        filters={
          <div className="flex flex-wrap gap-2">
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
          {canWrite && (
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProductStatusFilter)}>
              <SelectTrigger className="w-[150px]" aria-label="Filter status produk">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Nonaktif</SelectItem>
                <SelectItem value="all">Semua Status</SelectItem>
              </SelectContent>
            </Select>
          )}
          </div>
        }
      />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Produk"
        description={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />

      {canDelete && <CategoryManager open={categoryManagerOpen} onOpenChange={setCategoryManagerOpen} />}
      <ProductQuickAddModal open={quickAddOpen} onOpenChange={setQuickAddOpen} />
      <ProductBulkAddModal open={bulkAddOpen} onOpenChange={setBulkAddOpen} />
      <BulkEditModal
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        selectedProducts={selectedProducts}
        onComplete={() => setSelectedProducts([])}
      />
      <ProductTemplatesModal open={templatesOpen} onOpenChange={setTemplatesOpen} />
      <BarcodePrintModal
        open={barcodePrintOpen}
        onOpenChange={setBarcodePrintOpen}
        items={selectedProducts
          .filter((p) => p.sku)
          .map((p) => ({ name: p.name, barcode: p.sku!, sku: p.sku ?? undefined }))}
      />
    </div>
  );
}
