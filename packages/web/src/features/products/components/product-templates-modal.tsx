import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/api/endpoints/products.api';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast-utils';
import { Loader2, Coffee, ShoppingBag, Scissors, Package } from 'lucide-react';
import type { CreateProductRequest } from '@/types/product.types';

interface TemplateProduct {
  name: string;
  basePrice: number;
  category: string;
}

interface TemplateCategory {
  key: string;
  label: string;
  icon: typeof Coffee;
  products: TemplateProduct[];
}

const TEMPLATES: Record<string, TemplateCategory[]> = {
  fnb: [
    {
      key: 'kopi',
      label: 'Kopi & Minuman',
      icon: Coffee,
      products: [
        { name: 'Espresso', basePrice: 18000, category: 'Kopi' },
        { name: 'Americano', basePrice: 22000, category: 'Kopi' },
        { name: 'Latte', basePrice: 28000, category: 'Kopi' },
        { name: 'Cappuccino', basePrice: 28000, category: 'Kopi' },
        { name: 'Mocha', basePrice: 32000, category: 'Kopi' },
        { name: 'Teh Tarik', basePrice: 18000, category: 'Minuman' },
        { name: 'Matcha Latte', basePrice: 30000, category: 'Minuman' },
        { name: 'Jus Jeruk', basePrice: 20000, category: 'Minuman' },
      ],
    },
    {
      key: 'makanan',
      label: 'Makanan',
      icon: Package,
      products: [
        { name: 'Nasi Goreng', basePrice: 25000, category: 'Makanan' },
        { name: 'Mie Goreng', basePrice: 23000, category: 'Makanan' },
        { name: 'Ayam Goreng', basePrice: 28000, category: 'Makanan' },
        { name: 'Roti Bakar', basePrice: 18000, category: 'Snack' },
        { name: 'French Fries', basePrice: 20000, category: 'Snack' },
        { name: 'Croissant', basePrice: 22000, category: 'Snack' },
      ],
    },
  ],
  retail: [
    {
      key: 'pakaian',
      label: 'Pakaian',
      icon: ShoppingBag,
      products: [
        { name: 'Kaos Polos', basePrice: 75000, category: 'Pakaian' },
        { name: 'Kaos Sablon', basePrice: 95000, category: 'Pakaian' },
        { name: 'Celana Jeans', basePrice: 250000, category: 'Pakaian' },
        { name: 'Celana Pendek', basePrice: 120000, category: 'Pakaian' },
        { name: 'Jaket Hoodie', basePrice: 180000, category: 'Pakaian' },
        { name: 'Topi Baseball', basePrice: 65000, category: 'Aksesoris' },
      ],
    },
    {
      key: 'elektronik',
      label: 'Elektronik & Aksesoris',
      icon: Package,
      products: [
        { name: 'Charger USB-C', basePrice: 50000, category: 'Elektronik' },
        { name: 'Earphone Bluetooth', basePrice: 150000, category: 'Elektronik' },
        { name: 'Power Bank 10000mAh', basePrice: 120000, category: 'Elektronik' },
        { name: 'Casing HP Universal', basePrice: 35000, category: 'Aksesoris' },
        { name: 'Screen Protector', basePrice: 25000, category: 'Aksesoris' },
      ],
    },
  ],
  service: [
    {
      key: 'salon',
      label: 'Salon & Barbershop',
      icon: Scissors,
      products: [
        { name: 'Potong Rambut Pria', basePrice: 35000, category: 'Potong' },
        { name: 'Potong Rambut Wanita', basePrice: 50000, category: 'Potong' },
        { name: 'Creambath', basePrice: 75000, category: 'Perawatan' },
        { name: 'Hair Coloring', basePrice: 150000, category: 'Perawatan' },
        { name: 'Manicure', basePrice: 50000, category: 'Perawatan' },
        { name: 'Pedicure', basePrice: 60000, category: 'Perawatan' },
        { name: 'Facial', basePrice: 100000, category: 'Perawatan' },
      ],
    },
  ],
};

const BUSINESS_TYPES = [
  { key: 'fnb', label: 'F&B (Kafe/Restoran)', icon: Coffee },
  { key: 'retail', label: 'Retail (Toko)', icon: ShoppingBag },
  { key: 'service', label: 'Jasa (Salon/Barbershop)', icon: Scissors },
];

interface ProductTemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductTemplatesModal({ open, onOpenChange }: ProductTemplatesModalProps) {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});

  const categories = selectedType ? TEMPLATES[selectedType] ?? [] : [];
  const allProducts = useMemo(
    () => categories.flatMap((c) => c.products.map((p) => ({ ...p, key: `${c.key}-${p.name}` }))),
    [categories],
  );

  const importMutation = useMutation({
    mutationFn: async () => {
      const toImport = allProducts.filter((p) => selectedProducts.has(p.key));
      const results = await Promise.allSettled(
        toImport.map((p) => {
          const data: CreateProductRequest = {
            name: p.name,
            sku: p.name.toUpperCase().replace(/\s+/g, '-').slice(0, 20),
            basePrice: priceOverrides[p.key] ?? p.basePrice,
            costPrice: 0,
            trackStock: true,
          };
          return productsApi.create(data);
        }),
      );
      return results;
    },
    onSuccess: (results) => {
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success({
        title: `${ok} produk berhasil diimport`,
        description: failed > 0 ? `${failed} produk gagal` : undefined,
      });
      resetAndClose();
    },
    onError: () => {
      toast.error({ title: 'Gagal mengimport produk' });
    },
  });

  function resetAndClose() {
    setSelectedType(null);
    setSelectedProducts(new Set());
    setPriceOverrides({});
    onOpenChange(false);
  }

  function toggleProduct(key: string) {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    if (selectedProducts.size === allProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(allProducts.map((p) => p.key)));
    }
  }

  function handleSelectType(type: string) {
    setSelectedType(type);
    const prods = (TEMPLATES[type] ?? []).flatMap((c) =>
      c.products.map((p) => `${c.key}-${p.name}`),
    );
    setSelectedProducts(new Set(prods));
    setPriceOverrides({});
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && resetAndClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Template Produk</DialogTitle>
          <DialogDescription>
            Pilih template berdasarkan tipe bisnis untuk mengisi produk awal dengan cepat.
          </DialogDescription>
        </DialogHeader>

        {!selectedType ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {BUSINESS_TYPES.map((bt) => {
              const Icon = bt.icon;
              const count = (TEMPLATES[bt.key] ?? []).reduce((s, c) => s + c.products.length, 0);
              return (
                <button
                  key={bt.key}
                  className="flex flex-col items-center gap-2 rounded-lg border p-5 text-center transition-colors hover:bg-accent hover:border-primary/30"
                  onClick={() => handleSelectType(bt.key)}
                >
                  <Icon className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium">{bt.label}</span>
                  <Badge variant="secondary" className="text-xs">{count} produk</Badge>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setSelectedType(null)}>
                &larr; Pilih tipe lain
              </Button>
              <Button variant="outline" size="sm" onClick={selectAll}>
                {selectedProducts.size === allProducts.length ? 'Hapus Semua' : 'Pilih Semua'}
              </Button>
            </div>

            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.key}>
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold">{cat.label}</h4>
                  </div>
                  <div className="space-y-1.5">
                    {cat.products.map((product) => {
                      const key = `${cat.key}-${product.name}`;
                      const isSelected = selectedProducts.has(key);
                      return (
                        <div
                          key={key}
                          className={`flex items-center gap-3 rounded-md border p-2.5 transition-colors ${
                            isSelected ? 'border-primary/30 bg-primary/5' : ''
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleProduct(key)}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium">{product.name}</span>
                            <Badge variant="outline" className="ml-2 text-xs">{product.category}</Badge>
                          </div>
                          <Input
                            type="number"
                            className="w-28 text-right text-sm"
                            value={priceOverrides[key] ?? product.basePrice}
                            onChange={(e) =>
                              setPriceOverrides({ ...priceOverrides, [key]: Number(e.target.value) })
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedType && (
          <DialogFooter>
            <Button variant="outline" onClick={resetAndClose}>Batal</Button>
            <Button
              onClick={() => importMutation.mutate()}
              disabled={selectedProducts.size === 0 || importMutation.isPending}
            >
              {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import {selectedProducts.size} Produk
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
