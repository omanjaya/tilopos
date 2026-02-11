import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '@/api/endpoints/inventory.api';
import { productsApi } from '@/api/endpoints/products.api';
import { outletsApi } from '@/api/endpoints/outlets.api';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { formatCurrency } from '@/lib/format';
import { Store, Package, Search, CheckCircle2, XCircle } from 'lucide-react';
import type { Product } from '@/types/product.types';
import type { Outlet } from '@/types/outlet.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

export function ProductAssignmentPage() {
  const queryClient = useQueryClient();
  const [selectedOutletId, setSelectedOutletId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // Fetch outlets
  const { data: outlets = [] } = useQuery({
    queryKey: ['outlets'],
    queryFn: outletsApi.list,
  });

  // Fetch all products
  const { data: allProducts = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list(),
  });

  // Fetch assigned products for selected outlet
  const { data: assignedProducts = [], isLoading: loadingAssigned } = useQuery({
    queryKey: ['outlet-products', selectedOutletId],
    queryFn: () => inventoryApi.getOutletProducts(selectedOutletId),
    enabled: !!selectedOutletId,
  });

  // Fetch unassigned products for selected outlet
  const { data: unassignedProducts = [], isLoading: loadingUnassigned } = useQuery({
    queryKey: ['outlet-products-unassigned', selectedOutletId],
    queryFn: () => inventoryApi.getUnassignedProducts(selectedOutletId),
    enabled: !!selectedOutletId,
  });

  // Assign products mutation
  const assignMutation = useMutation({
    mutationFn: (productIds: string[]) => inventoryApi.assignProducts(selectedOutletId, productIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlet-products', selectedOutletId] });
      queryClient.invalidateQueries({ queryKey: ['outlet-products-unassigned', selectedOutletId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success({
        title: 'Produk berhasil di-assign',
        description: `${selectedProducts.size} produk ditambahkan ke outlet`,
      });
      setSelectedProducts(new Set());
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal assign produk',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  // Remove product mutation
  const removeMutation = useMutation({
    mutationFn: (productId: string) => inventoryApi.removeProductFromOutlet(selectedOutletId, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlet-products', selectedOutletId] });
      queryClient.invalidateQueries({ queryKey: ['outlet-products-unassigned', selectedOutletId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success({
        title: 'Produk berhasil dihapus',
        description: 'Produk telah dihapus dari outlet',
      });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menghapus produk',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  // Get assigned product IDs set for quick lookup
  const assignedProductIds = new Set(assignedProducts.map((p: Product) => p.id));

  // Filter and search products
  const displayProducts = allProducts.filter((product: Product) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        product.name.toLowerCase().includes(searchLower) ||
        product.sku?.toLowerCase().includes(searchLower) ||
        product.category?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Assignment filter
    const isAssigned = assignedProductIds.has(product.id);
    if (filterMode === 'assigned' && !isAssigned) return false;
    if (filterMode === 'unassigned' && isAssigned) return false;

    return true;
  });

  const handleToggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedProducts.size === displayProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(displayProducts.map((p) => p.id)));
    }
  };

  const handleAssignSelected = () => {
    if (selectedProducts.size === 0) return;

    // Only assign products that are not already assigned
    const productsToAssign = Array.from(selectedProducts).filter(
      (id) => !assignedProductIds.has(id)
    );

    if (productsToAssign.length === 0) {
      toast.error({
        title: 'Tidak ada produk yang perlu di-assign',
        description: 'Semua produk yang dipilih sudah di-assign ke outlet ini',
      });
      return;
    }

    assignMutation.mutate(productsToAssign);
  };

  const handleRemoveSelected = () => {
    if (selectedProducts.size === 0) return;

    // Only remove products that are currently assigned
    const productsToRemove = Array.from(selectedProducts).filter((id) =>
      assignedProductIds.has(id)
    );

    if (productsToRemove.length === 0) {
      toast.error({
        title: 'Tidak ada produk yang perlu dihapus',
        description: 'Semua produk yang dipilih sudah tidak di-assign ke outlet ini',
      });
      return;
    }

    // Remove products one by one
    Promise.all(productsToRemove.map((id) => removeMutation.mutateAsync(id)))
      .then(() => {
        setSelectedProducts(new Set());
      })
      .catch(() => {
        // Error already handled by mutation
      });
  };

  const selectedOutlet = outlets.find((o: Outlet) => o.id === selectedOutletId);
  const isLoading = loadingAssigned || loadingUnassigned;

  const assignedCount = assignedProducts.length;
  const unassignedCount = unassignedProducts.length;
  const totalCount = allProducts.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Produk per Outlet"
        description="Atur produk mana saja yang tersedia di setiap outlet"
        icon={Store}
      />

      {/* Outlet Selector */}
      <div className="rounded-lg border bg-card p-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Pilih Outlet</label>
            <Select value={selectedOutletId} onValueChange={setSelectedOutletId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Pilih outlet untuk manage produk" />
              </SelectTrigger>
              <SelectContent>
                {outlets.map((outlet: Outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      {outlet.name}
                      {outlet.outletType && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {outlet.outletType}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedOutlet && (
            <div className="grid grid-cols-3 gap-4 rounded-md border bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-500/10 p-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{assignedCount}</p>
                  <p className="text-xs text-muted-foreground">Produk Aktif</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-orange-500/10 p-2">
                  <XCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{unassignedCount}</p>
                  <p className="text-xs text-muted-foreground">Belum Di-assign</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-500/10 p-2">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalCount}</p>
                  <p className="text-xs text-muted-foreground">Total Produk</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedOutletId && (
        <div className="space-y-4">
          {/* Filters and Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari produk (nama, SKU, kategori)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterMode} onValueChange={(v: 'all' | 'assigned' | 'unassigned') => setFilterMode(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Produk</SelectItem>
                  <SelectItem value="assigned">Sudah Di-assign</SelectItem>
                  <SelectItem value="unassigned">Belum Di-assign</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedProducts.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedProducts.size} produk dipilih
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAssignSelected}
                  disabled={assignMutation.isPending}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Assign ke Outlet
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRemoveSelected}
                  disabled={removeMutation.isPending}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Hapus dari Outlet
                </Button>
              </div>
            )}
          </div>

          {/* Products Table */}
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedProducts.size === displayProducts.length && displayProducts.length > 0}
                      onCheckedChange={handleToggleAll}
                    />
                  </TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : displayProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Tidak ada produk
                    </TableCell>
                  </TableRow>
                ) : (
                  displayProducts.map((product: Product) => {
                    const isAssigned = assignedProductIds.has(product.id);
                    const isSelected = selectedProducts.has(product.id);

                    return (
                      <TableRow key={product.id} className={isSelected ? 'bg-muted/50' : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleProduct(product.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-10 w-10 rounded-md object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <span className="font-medium">{product.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs text-muted-foreground">{product.sku}</code>
                        </TableCell>
                        <TableCell>{product.category || '-'}</TableCell>
                        <TableCell>{formatCurrency(product.basePrice)}</TableCell>
                        <TableCell>
                          {isAssigned ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Aktif
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Tidak Aktif
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
