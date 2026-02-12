import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { priceTiersApi } from '@/api/endpoints/price-tiers.api';
import { productsApi } from '@/api/endpoints/products.api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast-utils';
import { Plus, Trash2, Save, TrendingUp } from 'lucide-react';

interface TierRow {
  tierName: string;
  minQuantity: string;
  maxQuantity: string;
  price: string;
}

function PriceTierEditor({ productId, productName }: { productId: string; productName: string }) {
  const queryClient = useQueryClient();

  const { data: tiers, isLoading } = useQuery({
    queryKey: ['price-tiers', productId],
    queryFn: () => priceTiersApi.listByProduct(productId),
  });

  const [rows, setRows] = useState<TierRow[]>([]);
  const [initialized, setInitialized] = useState(false);

  if (tiers && !initialized) {
    setRows(
      tiers.map((t) => ({
        tierName: t.tierName,
        minQuantity: String(t.minQuantity),
        maxQuantity: t.maxQuantity ? String(t.maxQuantity) : '',
        price: String(t.price),
      })),
    );
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      priceTiersApi.bulkCreate(
        productId,
        rows
          .filter((r) => r.tierName && r.minQuantity && r.price)
          .map((r) => ({
            tierName: r.tierName,
            minQuantity: parseInt(r.minQuantity, 10),
            maxQuantity: r.maxQuantity ? parseInt(r.maxQuantity, 10) : null,
            price: parseFloat(r.price),
            discountPercent: null,
          })),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-tiers', productId] });
      toast.success({ title: 'Harga bertingkat berhasil disimpan' });
    },
    onError: () => toast.error({ title: 'Gagal menyimpan' }),
  });

  const addRow = () => setRows([...rows, { tierName: '', minQuantity: '', maxQuantity: '', price: '' }]);
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx));
  const updateRow = (idx: number, field: keyof TierRow, value: string) => {
    setRows((prev) => prev.map((row, i) => i === idx ? { ...row, [field]: value } as TierRow : row));
  };

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{productName}</CardTitle>
        <Badge variant="outline">{rows.length} tier</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row, idx) => (
          <div key={idx} className="grid grid-cols-5 gap-2 items-end">
            <div>
              <Label className="text-xs">Nama Tier</Label>
              <Input
                value={row.tierName}
                onChange={(e) => updateRow(idx, 'tierName', e.target.value)}
                placeholder="Grosir"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Min Qty</Label>
              <Input
                type="number"
                value={row.minQuantity}
                onChange={(e) => updateRow(idx, 'minQuantity', e.target.value)}
                placeholder="10"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Max Qty</Label>
              <Input
                type="number"
                value={row.maxQuantity}
                onChange={(e) => updateRow(idx, 'maxQuantity', e.target.value)}
                placeholder="∞"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Harga</Label>
              <Input
                type="number"
                value={row.price}
                onChange={(e) => updateRow(idx, 'price', e.target.value)}
                placeholder="50000"
                className="h-9"
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeRow(idx)} className="h-9 w-9">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-1 h-4 w-4" /> Tambah Tier
          </Button>
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="mr-1 h-4 w-4" /> Simpan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PriceTiersPage() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: products, isLoading } = useQuery({
    queryKey: ['products-for-tiers'],
    queryFn: () => productsApi.list(),
  });

  const filteredProducts = (products ?? []).filter(
    (p: { name: string; sku?: string }) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Harga Bertingkat"
        description="Atur harga berbeda berdasarkan jumlah pembelian (grosir vs retail)"
      />

      <div className="flex gap-4">
        <div className="w-80 space-y-3">
          <Input
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-[calc(100vh-250px)] space-y-1 overflow-y-auto">
            {isLoading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            {filteredProducts.map((p: { id: string; name: string; sku?: string; basePrice: number }) => (
              <button
                key={p.id}
                onClick={() => setSelectedProductId(p.id)}
                className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm transition-colors ${
                  selectedProductId === p.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                }`}
              >
                <div>
                  <p className="font-medium">{p.name}</p>
                  {p.sku && <p className="text-xs text-muted-foreground">{p.sku}</p>}
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          {selectedProductId ? (
            <PriceTierEditor
              key={selectedProductId}
              productId={selectedProductId}
              productName={filteredProducts.find((p: { id: string }) => p.id === selectedProductId)?.name ?? ''}
            />
          ) : (
            <Card>
              <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
                Pilih produk untuk mengatur harga bertingkat
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
