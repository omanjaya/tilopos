import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/api/endpoints/products.api';
import { categoriesApi } from '@/api/endpoints/categories.api';
import { PageHeader } from '@/components/shared/page-header';
import { ImageUpload } from '@/components/shared/image-upload';
import { FeatureGate, FEATURES } from '@/components/shared/feature-gate';
import { useBusinessFeatures } from '@/hooks/use-business-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/lib/toast-utils';
import { Loader2, Plus, Trash2, ArrowLeft, Barcode } from 'lucide-react';
import type { CreateProductRequest, CreateVariantRequest } from '@/types/product.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [basePrice, setBasePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [trackStock, setTrackStock] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [variants, setVariants] = useState<CreateVariantRequest[]>([]);

  // Feature checks
  const { hasBarcodeScanning } = useBusinessFeatures();

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const { data: product } = useQuery({
    queryKey: ['products', id],
    queryFn: () => productsApi.get(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (product) {
      setName(product.name);
      setSku(product.sku);
      setDescription(product.description ?? '');
      setCategoryId(product.categoryId ?? '');
      setBasePrice(String(product.basePrice));
      setCostPrice(String(product.costPrice));
      setTrackStock(product.trackStock);
      setImageUrl(product.imageUrl);
      setVariants(
        product.variants.map((v) => ({
          name: v.name,
          sku: v.sku,
          price: v.price,
          costPrice: v.costPrice,
        })),
      );
    }
  }, [product]);

  const createMutation = useMutation({
    mutationFn: (data: CreateProductRequest) => productsApi.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success({
        title: 'Produk berhasil dibuat',
        description: `"${data.name}" telah ditambahkan ke daftar produk`,
      });
      navigate('/app/products');
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal membuat produk',
        description: error.response?.data?.message || 'Terjadi kesalahan saat membuat produk',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateProductRequest) => productsApi.update(id!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success({
        title: 'Produk berhasil diperbarui',
        description: `Perubahan pada "${data.name}" telah disimpan`,
      });
      navigate('/app/products');
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal memperbarui produk',
        description: error.response?.data?.message || 'Terjadi kesalahan saat memperbarui produk',
      });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: CreateProductRequest = {
      name,
      sku,
      description: description || undefined,
      categoryId: categoryId || undefined,
      basePrice: Number(basePrice),
      costPrice: Number(costPrice),
      trackStock,
      imageUrl: imageUrl ?? undefined,
      variants: variants.length > 0 ? variants : undefined,
    };

    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const addVariant = () => {
    setVariants([...variants, { name: '', price: 0, costPrice: 0 }]);
  };

  const updateVariant = (index: number, field: keyof CreateVariantRequest, value: string | number) => {
    setVariants(variants.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Produk' : 'Tambah Produk'}>
        <Button variant="outline" onClick={() => navigate('/app/products')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Produk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Produk</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">{hasBarcodeScanning ? 'SKU / Barcode' : 'SKU'}</Label>
                <div className="relative">
                  <Input
                    id="sku"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    required
                    placeholder={hasBarcodeScanning ? 'Scan atau ketik barcode' : 'SKU produk'}
                  />
                  {hasBarcodeScanning && (
                    <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="basePrice">Harga Jual</Label>
                <Input
                  id="basePrice"
                  type="number"
                  min="0"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPrice">Harga Modal</Label>
                <Input
                  id="costPrice"
                  type="number"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  required
                />
              </div>
            </div>

            <FeatureGate feature={FEATURES.STOCK_MANAGEMENT}>
              <div className="flex items-center gap-3">
                <Switch id="trackStock" checked={trackStock} onCheckedChange={setTrackStock} />
                <Label htmlFor="trackStock">Lacak Stok</Label>
              </div>
            </FeatureGate>

            <div className="space-y-2">
              <Label>Gambar Produk</Label>
              <ImageUpload value={imageUrl} onChange={setImageUrl} />
            </div>
          </CardContent>
        </Card>

        <FeatureGate feature={FEATURES.PRODUCT_VARIANTS}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Varian</CardTitle>
                <CardDescription>Tambahkan varian jika produk memiliki beberapa pilihan (ukuran, warna, dll)</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                <Plus className="mr-2 h-4 w-4" /> Tambah Varian
              </Button>
            </CardHeader>
            <CardContent>
              {variants.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada varian. Klik tombol di atas untuk menambahkan varian.
                </p>
              ) : (
                <div className="space-y-3">
                  {variants.map((variant, index) => (
                    <div key={index} className="flex items-end gap-3">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Nama</Label>
                        <Input
                          value={variant.name}
                          onChange={(e) => updateVariant(index, 'name', e.target.value)}
                          placeholder="Contoh: Large"
                          required
                        />
                      </div>
                      <div className="w-32 space-y-1">
                        <Label className="text-xs">Harga</Label>
                        <Input
                          type="number"
                          min="0"
                          value={variant.price}
                          onChange={(e) => updateVariant(index, 'price', Number(e.target.value))}
                          required
                        />
                      </div>
                      <div className="w-32 space-y-1">
                        <Label className="text-xs">Modal</Label>
                        <Input
                          type="number"
                          min="0"
                          value={variant.costPrice}
                          onChange={(e) => updateVariant(index, 'costPrice', Number(e.target.value))}
                          required
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeVariant(index)}
                        className="shrink-0 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </FeatureGate>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/app/products')}>
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            aria-busy={isPending}
            aria-label={isPending ? (isEdit ? 'Saving changes...' : 'Creating product...') : undefined}
          >
            {isPending && <Loader2 className="animate-spin" />}
            {isEdit ? 'Simpan Perubahan' : 'Buat Produk'}
          </Button>
        </div>
      </form>
    </div>
  );
}
