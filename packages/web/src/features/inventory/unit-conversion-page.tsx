import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unitConversionApi } from '@/api/endpoints/unit-conversion.api';
import { productsApi } from '@/api/endpoints/products.api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast-utils';
import { Plus, Trash2, ArrowRight, RefreshCw } from 'lucide-react';
import { ErrorState } from '@/components/shared/error-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { handleMutationError } from '@/lib/api-error-handler';

function ConversionEditor({ productId, productName }: { productId: string; productName: string }) {
  const queryClient = useQueryClient();

  const { data: conversions, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['unit-conversions', productId],
    queryFn: () => unitConversionApi.listByProduct(productId),
  });

  const [fromUnit, setFromUnit] = useState('');
  const [fromLabel, setFromLabel] = useState('');
  const [toUnit, setToUnit] = useState('');
  const [toLabel, setToLabel] = useState('');
  const [factor, setFactor] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const factorValue = Number(factor);
  const factorValid = factor !== '' && Number.isFinite(factorValue) && factorValue > 0;

  const createMutation = useMutation({
    mutationFn: () =>
      unitConversionApi.create({
        productId,
        fromUnit,
        fromUnitLabel: fromLabel,
        toUnit,
        toUnitLabel: toLabel,
        conversionFactor: factorValue,
        isDefault: (conversions?.length ?? 0) === 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit-conversions', productId] });
      toast.success({ title: 'Konversi satuan berhasil ditambahkan' });
      setFromUnit('');
      setFromLabel('');
      setToUnit('');
      setToLabel('');
      setFactor('');
    },
    onError: (err) => handleMutationError(err, 'Gagal menambahkan konversi satuan'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => unitConversionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit-conversions', productId] });
      toast.success({ title: 'Konversi dihapus' });
      setDeleteId(null);
    },
    onError: (err) => handleMutationError(err, 'Gagal menghapus konversi satuan'),
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  // isDefault of the next conversion depends on the current list, so don't allow adding without it
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{productName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {conversions?.map((conv) => (
          <div key={conv.id} className="flex items-center gap-3 rounded-lg border p-3">
            <Badge variant="secondary">1 {conv.fromUnitLabel}</Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge>{conv.conversionFactor} {conv.toUnitLabel}</Badge>
            {conv.isDefault && <Badge variant="outline" className="text-[10px]">Default</Badge>}
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setDeleteId(conv.id)}
              aria-label={`Hapus konversi ${conv.fromUnitLabel} ke ${conv.toUnitLabel}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}

        <div className="rounded-lg border-2 border-dashed p-4 space-y-3">
          <p className="text-sm font-medium">Tambah Konversi Baru</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Kode Satuan Asal</Label>
              <Input value={fromUnit} onChange={(e) => setFromUnit(e.target.value)} placeholder="box" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Label Satuan Asal</Label>
              <Input value={fromLabel} onChange={(e) => setFromLabel(e.target.value)} placeholder="Dus" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Kode Satuan Tujuan</Label>
              <Input value={toUnit} onChange={(e) => setToUnit(e.target.value)} placeholder="pcs" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Label Satuan Tujuan</Label>
              <Input value={toLabel} onChange={(e) => setToLabel(e.target.value)} placeholder="Pcs" className="h-9" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Faktor Konversi (1 satuan asal = ? satuan tujuan)</Label>
            <Input type="number" min={0} step="any" value={factor} onChange={(e) => setFactor(e.target.value)} placeholder="12" className="h-9" />
            {factor !== '' && !factorValid && (
              <p className="mt-1 text-xs text-destructive">Faktor konversi harus lebih besar dari 0</p>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={!fromUnit || !toUnit || !factorValid || createMutation.isPending}
          >
            <Plus className="mr-1 h-4 w-4" /> Tambah
          </Button>
        </div>
      </CardContent>
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Hapus konversi satuan?"
        description="Konversi satuan ini akan dihapus permanen."
        confirmLabel="Hapus"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        isLoading={deleteMutation.isPending}
      />
    </Card>
  );
}

export function UnitConversionPage() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: products, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['products-for-units'],
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
        title="Konversi Satuan"
        description="Atur konversi satuan produk (mis. 1 Dus = 12 Pcs)"
      />

      <div className="flex gap-4">
        <div className="w-80 space-y-3">
          <Input placeholder="Cari produk..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="max-h-[calc(100vh-250px)] space-y-1 overflow-y-auto">
            {isLoading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            {isError && <ErrorState error={error} onRetry={() => refetch()} />}
            {filteredProducts.map((p: { id: string; name: string; sku?: string }) => (
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
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          {selectedProductId ? (
            <ConversionEditor
              key={selectedProductId}
              productId={selectedProductId}
              productName={filteredProducts.find((p: { id: string }) => p.id === selectedProductId)?.name ?? ''}
            />
          ) : (
            <Card>
              <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
                Pilih produk untuk mengatur konversi satuan
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
