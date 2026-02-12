import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/api/endpoints/products.api';
import { categoriesApi } from '@/api/endpoints/categories.api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { MobileNavSpacer } from '@/components/shared/mobile-nav';
import { toast } from '@/lib/toast-utils';
import { formatCurrency } from '@/lib/format';
import {
  Plus,
  Search,
  SlidersHorizontal,
  Edit,
  Trash2,
  MoreVertical,
  Tags,
  Package,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import type { Product } from '@/types/product.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';
import { cn } from '@/lib/utils';

/**
 * ProductsPage Mobile Version
 *
 * Mobile-optimized products list with:
 * - Card-based layout (not table)
 * - Bottom sheet filters
 * - Floating action button
 * - Touch-optimized (min 44px targets)
 * - Swipeable actions
 */

export function ProductsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const user = useAuthStore((s) => s.user);
  const outletId = selectedOutletId ?? user?.outletId ?? '';
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', outletId, search, categoryFilter],
    queryFn: () =>
      productsApi.list({
        outletId: outletId || undefined,
        search: search || undefined,
        categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success({ title: 'Produk dihapus' });
      setDeleteTarget(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menghapus',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const products = productsData || [];
  const activeFiltersCount = categoryFilter !== 'all' ? 1 : 0;

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-xl font-bold">Produk</h1>
            <p className="text-sm text-muted-foreground">
              {products.length} produk
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/products/categories')}
            aria-label="Kelola kategori"
          >
            <Tags className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative min-h-[40px] min-w-[40px]" aria-label="Filter">
                <SlidersHorizontal className="h-4 w-4" />
                {activeFiltersCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[400px]">
              <SheetHeader>
                <SheetTitle>Filter Produk</SheetTitle>
                <SheetDescription>
                  Filter produk berdasarkan kategori dan status
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Kategori</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
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
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setCategoryFilter('all');
                      setFiltersOpen(false);
                    }}
                  >
                    Reset
                  </Button>
                  <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
                    Terapkan
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Products List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="h-16 w-16 rounded-md bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted/50 p-6 mb-4">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">Belum ada produk</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Tambahkan produk pertama Anda
            </p>
            <Button onClick={() => navigate('/app/products/new')}>
              <Plus className="mr-2 h-4 w-4" /> Tambah Produk
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={() => navigate(`/app/products/${product.id}/edit`)}
                onDelete={() => setDeleteTarget(product)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {products.length > 0 && (
        <Button
          size="lg"
          className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-lg"
          onClick={() => navigate('/app/products/new')}
          aria-label="Tambah produk"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Mobile Nav Spacer */}
      <MobileNavSpacer />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Hapus Produk"
        description={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

/**
 * ProductCard Component
 * Individual product card with swipeable actions
 */
interface ProductCardProps {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
}

function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 p-4">
          {/* Product Image */}
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-16 w-16 rounded-md object-cover shrink-0"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Package className="h-8 w-8" />
            </div>
          )}

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{product.name}</h3>
            <p className="text-sm text-muted-foreground">{product.sku}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-semibold text-primary">
                {formatCurrency(product.basePrice)}
              </span>
              {product.category && (
                <Badge variant="secondary" className="text-xs">
                  {product.category.name}
                </Badge>
              )}
            </div>
          </div>

          {/* Actions Menu */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 min-h-[44px] min-w-[44px]"
                aria-label="Aksi produk"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto">
              <div className="py-4">
                <h3 className="font-semibold mb-4">{product.name}</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-12"
                    onClick={() => {
                      onEdit();
                      setMenuOpen(false);
                    }}
                  >
                    <Edit className="mr-3 h-5 w-5" />
                    Edit Produk
                  </Button>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start h-12',
                      'text-destructive hover:text-destructive hover:bg-destructive/10'
                    )}
                    onClick={() => {
                      onDelete();
                      setMenuOpen(false);
                    }}
                  >
                    <Trash2 className="mr-3 h-5 w-5" />
                    Hapus Produk
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Status Badge */}
        {!product.isActive && (
          <div className="px-4 pb-3">
            <Badge variant="outline" className="w-full justify-center">
              Nonaktif
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
