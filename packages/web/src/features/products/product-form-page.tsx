import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { productsApi } from '@/api/endpoints/products.api';
import { categoriesApi } from '@/api/endpoints/categories.api';
import { PageHeader } from '@/components/shared/page-header';
import { ImageUpload } from '@/components/shared/image-upload';
import { FeatureGate, FEATURES } from '@/components/shared/feature-gate';
import { useBusinessFeatures } from '@/hooks/use-business-features';
import { FormFieldError } from '@/components/shared/form-field-error';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, ArrowLeft, Barcode, Save, Power, Wand2 } from 'lucide-react';
import { generateEAN13, BarcodePreview } from './components/barcode-generator';
import type { CreateProductRequest, CreateVariantRequest, ProductVariant } from '@/types/product.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

// Zod schema for product variant validation
const variantSchema = z.object({
  name: z.string().min(1, 'Nama varian wajib diisi'),
  price: z.number().min(0, 'Harga varian tidak boleh negatif'),
  costPrice: z.number().min(0, 'Harga modal varian tidak boleh negatif'),
});

// Zod schema for product validation
const productSchema = z.object({
  name: z.string().min(2, 'Nama produk minimal 2 karakter').max(255, 'Nama produk maksimal 255 karakter'),
  sku: z.string().min(1, 'SKU wajib diisi'),
  basePrice: z.number().min(0, 'Harga jual tidak boleh negatif'),
  costPrice: z.number().min(0, 'Harga modal tidak boleh negatif'),
  variants: z.array(variantSchema).optional(),
});

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [basePrice, setBasePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [trackStock, setTrackStock] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [variants, setVariants] = useState<CreateVariantRequest[]>([]);

  // Validation state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Feature checks
  const { hasBarcodeScanning } = useBusinessFeatures();

  // Validation functions
  const validateField = (fieldName: string, value: unknown) => {
    try {
      // Create a partial schema for single field validation
      const fieldSchema = z.object({
        [fieldName]: productSchema.shape[fieldName as keyof typeof productSchema.shape],
      });
      fieldSchema.parse({ [fieldName]: value });

      // Clear error for this field
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors[0]?.message || 'Validasi gagal';
        setFieldErrors((prev) => ({ ...prev, [fieldName]: errorMessage }));
        return false;
      }
      return true;
    }
  };

  const validateVariantField = (index: number, fieldName: string, value: unknown) => {
    const variant = variants[index];
    if (!variant) return false;

    try {
      variantSchema.shape[fieldName as keyof typeof variantSchema.shape].parse(value);

      // Clear error for this variant field
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`variants.${index}.${fieldName}`];
        return newErrors;
      });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors[0]?.message || 'Validasi gagal';
        setFieldErrors((prev) => ({
          ...prev,
          [`variants.${index}.${fieldName}`]: errorMessage,
        }));
        return false;
      }
      return true;
    }
  };

  const validateForm = (): boolean => {
    try {
      productSchema.parse({
        name,
        sku,
        basePrice: Number(basePrice) || 0,
        costPrice: Number(costPrice) || 0,
        variants: variants.length > 0 ? variants : undefined,
      });

      // Clear all errors if validation passes
      setFieldErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          errors[path] = err.message || 'Validasi gagal';
        });
        setFieldErrors(errors);

        // Mark all fields with errors as touched
        const touchedFields: Record<string, boolean> = {};
        error.errors.forEach((err) => {
          touchedFields[err.path.join('.')] = true;
        });
        setTouched((prev) => ({ ...prev, ...touchedFields }));
      }
      return false;
    }
  };

  const handleBlur = (fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));

    let value: unknown;
    switch (fieldName) {
      case 'name':
        value = name;
        break;
      case 'sku':
        value = sku;
        break;
      case 'basePrice':
        value = Number(basePrice) || 0;
        break;
      case 'costPrice':
        value = Number(costPrice) || 0;
        break;
      default:
        return;
    }
    validateField(fieldName, value);
  };

  const handleVariantBlur = (index: number, fieldName: string) => {
    const fieldKey = `variants.${index}.${fieldName}`;
    setTouched((prev) => ({ ...prev, [fieldKey]: true }));

    const variant = variants[index];
    if (!variant) return;

    let value: unknown;
    switch (fieldName) {
      case 'name':
        value = variant.name;
        break;
      case 'price':
        value = variant.price;
        break;
      case 'costPrice':
        value = variant.costPrice;
        break;
      default:
        return;
    }
    validateVariantField(index, fieldName, value);
  };

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

  // Variant mutations (edit mode only)
  const addVariantMutation = useMutation({
    mutationFn: (data: CreateVariantRequest) => productsApi.addVariant(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success({ title: 'Varian berhasil ditambahkan' });
      setNewVariant(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menambah varian',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const updateVariantMutation = useMutation({
    mutationFn: ({ variantId, data }: { variantId: string; data: Partial<CreateVariantRequest> }) =>
      productsApi.updateVariant(id!, variantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success({ title: 'Varian berhasil diperbarui' });
      setEditingVariantId(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal memperbarui varian',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const deleteVariantMutation = useMutation({
    mutationFn: (variantId: string) => productsApi.deleteVariant(id!, variantId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['products', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success({
        title: 'Varian dinonaktifkan',
        description: result.hadTransactions
          ? `Varian memiliki ${result.transactionCount} transaksi historis, dinonaktifkan (tidak dihapus)`
          : 'Varian berhasil dinonaktifkan',
      });
      setDeactivatingVariant(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menonaktifkan varian',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  // Variant editing states (edit mode)
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editingVariantData, setEditingVariantData] = useState<Partial<CreateVariantRequest & { barcode?: string }>>({});
  const [newVariant, setNewVariant] = useState<(CreateVariantRequest & { barcode?: string }) | null>(null);
  const [deactivatingVariant, setDeactivatingVariant] = useState<ProductVariant | null>(null);

  const startEditVariant = (v: ProductVariant) => {
    setEditingVariantId(v.id);
    setEditingVariantData({ name: v.name, sku: v.sku, barcode: v.barcode ?? '', price: v.price, costPrice: v.costPrice });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Run full validation
    if (!validateForm()) {
      toast.error({
        title: 'Validasi Gagal',
        description: 'Mohon periksa kembali formulir Anda. Terdapat kesalahan pada beberapa field.',
      });
      return;
    }

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
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => handleBlur('name')}
                  aria-invalid={touched.name && !!fieldErrors.name}
                  aria-describedby={touched.name && fieldErrors.name ? 'name-error' : undefined}
                  required
                  autoFocus={!isEdit}
                />
                <FormFieldError error={fieldErrors.name} touched={touched.name} id="name-error" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">{hasBarcodeScanning ? 'SKU / Barcode' : 'SKU'}</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="sku"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      onBlur={() => handleBlur('sku')}
                      aria-invalid={touched.sku && !!fieldErrors.sku}
                      aria-describedby={touched.sku && fieldErrors.sku ? 'sku-error' : undefined}
                      required
                      placeholder={hasBarcodeScanning ? 'Scan atau ketik barcode' : 'SKU produk'}
                      className={hasBarcodeScanning ? 'pr-10' : ''}
                    />
                    {hasBarcodeScanning && (
                      <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setSku(generateEAN13())}
                  >
                    <Wand2 className="mr-1 h-3.5 w-3.5" /> Generate
                  </Button>
                </div>
                <FormFieldError error={fieldErrors.sku} touched={touched.sku} id="sku-error" />
                {sku && sku.length >= 8 && (
                  <div className="pt-1">
                    <BarcodePreview value={sku} height={40} width={1.5} />
                  </div>
                )}
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
                  onBlur={() => handleBlur('basePrice')}
                  aria-invalid={touched.basePrice && !!fieldErrors.basePrice}
                  aria-describedby={touched.basePrice && fieldErrors.basePrice ? 'basePrice-error' : undefined}
                  required
                />
                <FormFieldError error={fieldErrors.basePrice} touched={touched.basePrice} id="basePrice-error" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPrice">Harga Modal</Label>
                <Input
                  id="costPrice"
                  type="number"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  onBlur={() => handleBlur('costPrice')}
                  aria-invalid={touched.costPrice && !!fieldErrors.costPrice}
                  aria-describedby={touched.costPrice && fieldErrors.costPrice ? 'costPrice-error' : undefined}
                  required
                />
                <FormFieldError error={fieldErrors.costPrice} touched={touched.costPrice} id="costPrice-error" />
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
              {isEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNewVariant({ name: '', price: 0, costPrice: 0 })}
                  disabled={!!newVariant}
                >
                  <Plus className="mr-2 h-4 w-4" /> Tambah Varian
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                  <Plus className="mr-2 h-4 w-4" /> Tambah Varian
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isEdit ? (
                /* ── Edit Mode: variant CRUD with individual API calls ── */
                <div className="space-y-3">
                  {(!product?.variants || product.variants.filter((v) => v.isActive).length === 0) && !newVariant && (
                    <p className="text-sm text-muted-foreground">
                      Belum ada varian aktif. Klik tombol di atas untuk menambahkan.
                    </p>
                  )}

                  {product?.variants.filter((v) => v.isActive).map((v) => (
                    <div key={v.id} className="rounded-lg border p-3">
                      {editingVariantId === v.id ? (
                        /* Inline editing */
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Nama</Label>
                              <Input
                                value={editingVariantData.name ?? ''}
                                onChange={(e) => setEditingVariantData((d) => ({ ...d, name: e.target.value }))}
                                placeholder="Nama varian"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">SKU</Label>
                              <Input
                                value={editingVariantData.sku ?? ''}
                                onChange={(e) => setEditingVariantData((d) => ({ ...d, sku: e.target.value }))}
                                placeholder="SKU varian"
                              />
                            </div>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Barcode</Label>
                              <Input
                                value={editingVariantData.barcode ?? ''}
                                onChange={(e) => setEditingVariantData((d) => ({ ...d, barcode: e.target.value }))}
                                placeholder="Barcode"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Harga</Label>
                              <Input
                                type="number"
                                min="0"
                                value={editingVariantData.price ?? 0}
                                onChange={(e) => setEditingVariantData((d) => ({ ...d, price: Number(e.target.value) }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Modal</Label>
                              <Input
                                type="number"
                                min="0"
                                value={editingVariantData.costPrice ?? 0}
                                onChange={(e) => setEditingVariantData((d) => ({ ...d, costPrice: Number(e.target.value) }))}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingVariantId(null)}>
                              Batal
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={updateVariantMutation.isPending}
                              onClick={() => updateVariantMutation.mutate({ variantId: v.id, data: editingVariantData })}
                            >
                              {updateVariantMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                              <Save className="mr-1 h-3 w-3" /> Simpan
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Display mode */
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{v.name}</span>
                              {v.sku && <Badge variant="outline" className="text-[10px]">{v.sku}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Rp {v.price.toLocaleString('id-ID')}
                              {v.costPrice > 0 && <span className="ml-2 text-xs">(Modal: Rp {v.costPrice.toLocaleString('id-ID')})</span>}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button type="button" variant="ghost" size="sm" onClick={() => startEditVariant(v)}>
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setDeactivatingVariant(v)}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* New variant form (edit mode) */}
                  {newVariant && (
                    <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 space-y-3">
                      <p className="text-xs font-semibold text-primary">Varian Baru</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Nama</Label>
                          <Input
                            value={newVariant.name}
                            onChange={(e) => setNewVariant((v) => v && ({ ...v, name: e.target.value }))}
                            placeholder="Contoh: Large"
                            autoFocus
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">SKU</Label>
                          <Input
                            value={newVariant.sku ?? ''}
                            onChange={(e) => setNewVariant((v) => v && ({ ...v, sku: e.target.value }))}
                            placeholder="SKU (opsional)"
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Harga</Label>
                          <Input
                            type="number"
                            min="0"
                            value={newVariant.price}
                            onChange={(e) => setNewVariant((v) => v && ({ ...v, price: Number(e.target.value) }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Modal</Label>
                          <Input
                            type="number"
                            min="0"
                            value={newVariant.costPrice}
                            onChange={(e) => setNewVariant((v) => v && ({ ...v, costPrice: Number(e.target.value) }))}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setNewVariant(null)}>
                          Batal
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={addVariantMutation.isPending || !newVariant.name}
                          onClick={() => addVariantMutation.mutate(newVariant)}
                        >
                          {addVariantMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                          <Plus className="mr-1 h-3 w-3" /> Tambah
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Create Mode: bundled with product create ── */
                <>
                  {variants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Belum ada varian. Klik tombol di atas untuk menambahkan varian.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {variants.map((variant, index) => (
                        <div key={index} className="space-y-3">
                          <div className="flex items-end gap-3">
                            <div className="flex-1 space-y-1">
                              <Label htmlFor={`variant-name-${index}`} className="text-xs">Nama</Label>
                              <Input
                                id={`variant-name-${index}`}
                                value={variant.name}
                                onChange={(e) => updateVariant(index, 'name', e.target.value)}
                                onBlur={() => handleVariantBlur(index, 'name')}
                                aria-invalid={touched[`variants.${index}.name`] && !!fieldErrors[`variants.${index}.name`]}
                                aria-describedby={
                                  touched[`variants.${index}.name`] && fieldErrors[`variants.${index}.name`]
                                    ? `variant-name-${index}-error`
                                    : undefined
                                }
                                placeholder="Contoh: Large"
                                required
                              />
                            </div>
                            <div className="w-32 space-y-1">
                              <Label htmlFor={`variant-price-${index}`} className="text-xs">Harga</Label>
                              <Input
                                id={`variant-price-${index}`}
                                type="number"
                                min="0"
                                value={variant.price}
                                onChange={(e) => updateVariant(index, 'price', Number(e.target.value))}
                                onBlur={() => handleVariantBlur(index, 'price')}
                                aria-invalid={touched[`variants.${index}.price`] && !!fieldErrors[`variants.${index}.price`]}
                                aria-describedby={
                                  touched[`variants.${index}.price`] && fieldErrors[`variants.${index}.price`]
                                    ? `variant-price-${index}-error`
                                    : undefined
                                }
                                required
                              />
                            </div>
                            <div className="w-32 space-y-1">
                              <Label htmlFor={`variant-cost-${index}`} className="text-xs">Modal</Label>
                              <Input
                                id={`variant-cost-${index}`}
                                type="number"
                                min="0"
                                value={variant.costPrice}
                                onChange={(e) => updateVariant(index, 'costPrice', Number(e.target.value))}
                                onBlur={() => handleVariantBlur(index, 'costPrice')}
                                aria-invalid={touched[`variants.${index}.costPrice`] && !!fieldErrors[`variants.${index}.costPrice`]}
                                aria-describedby={
                                  touched[`variants.${index}.costPrice`] && fieldErrors[`variants.${index}.costPrice`]
                                    ? `variant-cost-${index}-error`
                                    : undefined
                                }
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
                          <div className="flex gap-3 px-1">
                            <div className="flex-1">
                              <FormFieldError
                                error={fieldErrors[`variants.${index}.name`]}
                                touched={touched[`variants.${index}.name`]}
                                id={`variant-name-${index}-error`}
                              />
                            </div>
                            <div className="w-32">
                              <FormFieldError
                                error={fieldErrors[`variants.${index}.price`]}
                                touched={touched[`variants.${index}.price`]}
                                id={`variant-price-${index}-error`}
                              />
                            </div>
                            <div className="w-32">
                              <FormFieldError
                                error={fieldErrors[`variants.${index}.costPrice`]}
                                touched={touched[`variants.${index}.costPrice`]}
                                id={`variant-cost-${index}-error`}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </FeatureGate>

        {/* Deactivate Variant Confirmation */}
        <Dialog open={!!deactivatingVariant} onOpenChange={(open) => !open && setDeactivatingVariant(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nonaktifkan Varian?</DialogTitle>
              <DialogDescription>
                Varian &quot;{deactivatingVariant?.name}&quot; akan dinonaktifkan dan tidak muncul di POS.
                Riwayat transaksi yang menggunakan varian ini tetap tersimpan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeactivatingVariant(null)}>
                Batal
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteVariantMutation.isPending}
                onClick={() => deactivatingVariant && deleteVariantMutation.mutate(deactivatingVariant.id)}
              >
                {deleteVariantMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Nonaktifkan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
