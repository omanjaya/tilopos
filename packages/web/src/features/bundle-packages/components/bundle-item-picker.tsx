import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/api/endpoints/products.api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface BundleItemPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: { productId: string; productName: string; variantId?: string; variantName?: string; quantity: number }) => void;
}

export function BundleItemPicker({ open, onOpenChange, onAdd }: BundleItemPickerProps) {
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  const { data: products = [] } = useQuery({
    queryKey: ['products', search],
    queryFn: () => productsApi.list({ search: search || undefined }),
    enabled: open,
  });

  const product = products.find((p) => p.id === selectedProduct);

  const handleAdd = () => {
    if (!product) return;

    const variant = product.variants?.find((v) => v.id === selectedVariant);

    onAdd({
      productId: product.id,
      productName: product.name,
      variantId: variant?.id,
      variantName: variant?.name,
      quantity,
    });

    // Reset
    setSelectedProduct(null);
    setSelectedVariant('');
    setQuantity(1);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pilih Produk</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="max-h-60 overflow-auto space-y-1">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedProduct(p.id);
                  setSelectedVariant('');
                }}
                className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                  selectedProduct === p.id ? 'bg-primary/10 border border-primary' : 'hover:bg-muted'
                }`}
              >
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="h-10 w-10 rounded object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {p.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(p.basePrice)}</p>
                </div>
                {p.variants && p.variants.length > 0 && (
                  <span className="text-xs text-muted-foreground">{p.variants?.length ?? 0} varian</span>
                )}
              </button>
            ))}
            {products.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                Tidak ada produk ditemukan
              </p>
            )}
          </div>

          {selectedProduct && product && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">Produk: {product.name}</p>

              {product.variants && product.variants.length > 0 && product.variants && product.variants.length > 0 && (
                <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Varian" />
                  </SelectTrigger>
                  <SelectContent>
                    {product.variants.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} - {formatCurrency(v.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div>
                <label className="text-sm text-muted-foreground">Jumlah</label>
                <Input
                  type="number"
                  min={0.001}
                  step={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>

              <Button onClick={handleAdd} className="w-full" disabled={product.variants && product.variants.length > 0 && !selectedVariant}>
                <Plus className="mr-2 h-4 w-4" /> Tambahkan
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
