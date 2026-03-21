import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { productsApi } from '@/api/endpoints/products.api';
import { categoriesApi } from '@/api/endpoints/categories.api';
import { PageHeader } from '@/components/shared/page-header';
import { ImageUpload } from '@/components/shared/image-upload';
import { FeatureGate, FEATURES } from '@/components/shared/feature-gate';
import { useBusinessFeatures } from '@/hooks/use-business-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
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
import { generateEAN13 } from '@/lib/barcode-utils';
import { BarcodePreview } from './components/barcode-generator';
import type { CreateProductRequest, CreateVariantRequest, ProductVariant } from '@/types/product.types';

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
  description: z.string().optional(),
  categoryId: z.string().optional(),
  basePrice: z.number().min(0, 'Harga jual tidak boleh negatif'),
  costPrice: z.number().min(0, 'Harga modal tidak boleh negatif'),
  trackStock: z.boolean(),
  imageUrl: z.string().nullable().optional(),
  variants: z.array(variantSchema).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Feature checks
  const { hasBarcodeScanning } = useBusinessFeatures();

  // React Hook Form
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      description: '',
      categoryId: '',
      basePrice: 0,
      costPrice: 0,
      trackStock: true,
      imageUrl: null,
      variants: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'variants',
  });

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
      form.reset({
        name: product.name,
        sku: product.sku,
        description: product.description ?? '',
        categoryId: product.categoryId ?? '',
        basePrice: product.basePrice,
        costPrice: product.costPrice,
        trackStock: product.trackStock,
        imageUrl: product.imageUrl,
        variants: (product.variants ?? []).map((v) => ({
          name: v.name,
          price: v.price,
          costPrice: v.costPrice,
        })),
      });
    }
  }, [product, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreateProductRequest) => productsApi.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['pos'] });
      toast.success({
        title: 'Produk berhasil dibuat',
        description: `"${data.name}" telah ditambahkan ke daftar produk`,
      });
      navigate('/app/products');
    },
    onError: (error) => handleMutationError(error, 'Gagal membuat produk'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateProductRequest) => productsApi.update(id!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['pos'] });
      toast.success({
        title: 'Produk berhasil diperbarui',
        description: `Perubahan pada "${data.name}" telah disimpan`,
      });
      navigate('/app/products');
    },
    onError: (error) => handleMutationError(error, 'Gagal memperbarui produk'),
  });

  // Variant mutations (edit mode only)
  const addVariantMutation = useMutation({
    mutationFn: (data: CreateVariantRequest) => productsApi.addVariant(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['pos'] });
      toast.success({ title: 'Varian berhasil ditambahkan' });
      setNewVariant(null);
    },
    onError: (error) => handleMutationError(error, 'Gagal menambah varian'),
  });

  const updateVariantMutation = useMutation({
    mutationFn: ({ variantId, data }: { variantId: string; data: Partial<CreateVariantRequest> }) =>
      productsApi.updateVariant(id!, variantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['pos'] });
      toast.success({ title: 'Varian berhasil diperbarui' });
      setEditingVariantId(null);
    },
    onError: (error) => handleMutationError(error, 'Gagal memperbarui varian'),
  });

  const deleteVariantMutation = useMutation({
    mutationFn: (variantId: string) => productsApi.deleteVariant(id!, variantId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['products', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['pos'] });
      toast.success({
        title: 'Varian dinonaktifkan',
        description: result.hadTransactions
          ? `Varian memiliki ${result.transactionCount} transaksi historis, dinonaktifkan (tidak dihapus)`
          : 'Varian berhasil dinonaktifkan',
      });
      setDeactivatingVariant(null);
    },
    onError: (error) => handleMutationError(error, 'Gagal menonaktifkan varian'),
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

  const onSubmit = (formData: ProductFormData) => {
    const data: CreateProductRequest = {
      name: formData.name,
      sku: formData.sku,
      description: formData.description || undefined,
      categoryId: formData.categoryId || undefined,
      basePrice: formData.basePrice,
      costPrice: formData.costPrice,
      trackStock: formData.trackStock,
      imageUrl: formData.imageUrl ?? undefined,
      variants: formData.variants && formData.variants.length > 0 ? formData.variants : undefined,
    };

    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleFormSubmit = form.handleSubmit(onSubmit, () => {
    toast.error({
      title: 'Validasi Gagal',
      description: 'Mohon periksa kembali formulir Anda. Terdapat kesalahan pada beberapa field.',
    });
  });

  // Watched sku value for barcode preview
  // eslint-disable-next-line react-hooks/incompatible-library
  const skuValue = form.watch('sku');

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Produk' : 'Tambah Produk'}>
        <Button variant="outline" onClick={() => navigate('/app/products')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
      </PageHeader>

      <Form {...form}>
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Produk</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Produk</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          required
                          autoFocus={!isEdit}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{hasBarcodeScanning ? 'SKU / Barcode' : 'SKU'}</FormLabel>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <FormControl>
                            <Input
                              {...field}
                              required
                              placeholder={hasBarcodeScanning ? 'Scan atau ketik barcode' : 'SKU produk'}
                              className={hasBarcodeScanning ? 'pr-10' : ''}
                            />
                          </FormControl>
                          {hasBarcodeScanning && (
                            <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => form.setValue('sku', generateEAN13(), { shouldValidate: true })}
                        >
                          <Wand2 className="mr-1 h-3.5 w-3.5" /> Generate
                        </Button>
                      </div>
                      <FormMessage />
                      {skuValue && skuValue.length >= 8 && (
                        <div className="pt-1">
                          <BarcodePreview value={skuValue} height={40} width={1.5} />
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih kategori" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="basePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Harga Jual</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                          onFocus={(e) => { if (e.target.value === '0') e.target.value = ''; }}
                          onBlur={(e) => {
                            if (e.target.value === '') field.onChange(0);
                            field.onBlur();
                          }}
                          required
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Harga Modal</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                          onFocus={(e) => { if (e.target.value === '0') e.target.value = ''; }}
                          onBlur={(e) => {
                            if (e.target.value === '') field.onChange(0);
                            field.onBlur();
                          }}
                          required
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FeatureGate feature={FEATURES.STOCK_MANAGEMENT}>
                <FormField
                  control={form.control}
                  name="trackStock"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-3">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!mt-0">Lacak Stok</FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FeatureGate>

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gambar Produk</FormLabel>
                    <FormControl>
                      <ImageUpload value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', price: 0, costPrice: 0 })}>
                    <Plus className="mr-2 h-4 w-4" /> Tambah Varian
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isEdit ? (
                  /* -- Edit Mode: variant CRUD with individual API calls -- */
                  <div className="space-y-3">
                    {(!product?.variants || product.variants.filter((v) => v.isActive).length === 0) && !newVariant && (
                      <p className="text-sm text-muted-foreground">
                        Belum ada varian aktif. Klik tombol di atas untuk menambahkan.
                      </p>
                    )}

                    {product?.variants?.filter((v) => v.isActive).map((v) => (
                      <div key={v.id} className="rounded-lg border p-3">
                        {editingVariantId === v.id ? (
                          /* Inline editing */
                          <div className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1">
                                <label className="text-xs font-medium">Nama</label>
                                <Input
                                  value={editingVariantData.name ?? ''}
                                  onChange={(e) => setEditingVariantData((d) => ({ ...d, name: e.target.value }))}
                                  placeholder="Nama varian"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium">SKU</label>
                                <Input
                                  value={editingVariantData.sku ?? ''}
                                  onChange={(e) => setEditingVariantData((d) => ({ ...d, sku: e.target.value }))}
                                  placeholder="SKU varian"
                                />
                              </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3">
                              <div className="space-y-1">
                                <label className="text-xs font-medium">Barcode</label>
                                <Input
                                  value={editingVariantData.barcode ?? ''}
                                  onChange={(e) => setEditingVariantData((d) => ({ ...d, barcode: e.target.value }))}
                                  placeholder="Barcode"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium">Harga</label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={editingVariantData.price ?? 0}
                                  onChange={(e) => setEditingVariantData((d) => ({ ...d, price: Number(e.target.value) }))}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium">Modal</label>
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
                            <label className="text-xs font-medium">Nama</label>
                            <Input
                              value={newVariant.name}
                              onChange={(e) => setNewVariant((v) => v && ({ ...v, name: e.target.value }))}
                              placeholder="Contoh: Large"
                              autoFocus
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium">SKU</label>
                            <Input
                              value={newVariant.sku ?? ''}
                              onChange={(e) => setNewVariant((v) => v && ({ ...v, sku: e.target.value }))}
                              placeholder="SKU (opsional)"
                            />
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Harga</label>
                            <Input
                              type="number"
                              min="0"
                              value={newVariant.price}
                              onChange={(e) => setNewVariant((v) => v && ({ ...v, price: Number(e.target.value) }))}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Modal</label>
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
                  /* -- Create Mode: bundled with product create -- */
                  <>
                    {fields.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Belum ada varian. Klik tombol di atas untuk menambahkan varian.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {fields.map((fieldItem, index) => (
                          <div key={fieldItem.id} className="space-y-3">
                            <div className="flex items-end gap-3">
                              <FormField
                                control={form.control}
                                name={`variants.${index}.name`}
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormLabel className="text-xs">Nama</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="Contoh: Large"
                                        required
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`variants.${index}.price`}
                                render={({ field }) => (
                                  <FormItem className="w-32">
                                    <FormLabel className="text-xs">Harga</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        {...field}
                                        value={field.value || ''}
                                        onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                        required
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`variants.${index}.costPrice`}
                                render={({ field }) => (
                                  <FormItem className="w-32">
                                    <FormLabel className="text-xs">Modal</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        {...field}
                                        value={field.value || ''}
                                        onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                        required
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(index)}
                                className="shrink-0 text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
      </Form>
    </div>
  );
}
