import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bundlePackagesApi } from '@/api/endpoints/bundle-packages.api';
import { settingsApi } from '@/api/endpoints/settings.api';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { BundleItemPicker } from './components/bundle-item-picker';

interface BundleItem {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  sortOrder: number;
}

export function BundleFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);
  const [items, setItems] = useState<BundleItem[]>([]);
  const [selectedOutletIds, setSelectedOutletIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: outlets = [] } = useQuery({
    queryKey: ['outlets'],
    queryFn: () => settingsApi.getOutlets(),
  });

  const { data: existingBundle } = useQuery({
    queryKey: ['bundle-packages', id],
    queryFn: () => bundlePackagesApi.get(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingBundle) {
      setName(existingBundle.name);
      setDescription(existingBundle.description || '');
      setPrice(existingBundle.price);
      setCostPrice(existingBundle.costPrice ?? '');
      setIsActive(existingBundle.isActive);
      setItems(
        existingBundle.items.map((item, idx) => ({
          productId: item.productId,
          productName: item.product.name,
          variantId: item.variantId || undefined,
          variantName: item.variant?.name,
          quantity: item.quantity,
          sortOrder: item.sortOrder ?? idx,
        })),
      );
      setSelectedOutletIds(existingBundle.outlets.map((o) => o.outletId));
    }
  }, [existingBundle]);

  // Default: select all outlets for new bundle
  useEffect(() => {
    if (!isEdit && outlets.length > 0 && selectedOutletIds.length === 0) {
      setSelectedOutletIds(outlets.map((o) => o.id));
    }
  }, [outlets, isEdit, selectedOutletIds.length]);

  const createMutation = useMutation({
    mutationFn: bundlePackagesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bundle-packages'] });
      toast.success({ title: 'Paket bundle berhasil dibuat' });
      navigate('/app/bundle-packages');
    },
    onError: (error) => handleMutationError(error, 'Gagal membuat paket bundle'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof bundlePackagesApi.update>[1]) =>
      bundlePackagesApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bundle-packages'] });
      toast.success({ title: 'Paket bundle berhasil diperbarui' });
      navigate('/app/bundle-packages');
    },
    onError: (error) => handleMutationError(error, 'Gagal memperbarui paket bundle'),
  });

  const handleAddItem = (item: { productId: string; productName: string; variantId?: string; variantName?: string; quantity: number }) => {
    setItems((prev) => [
      ...prev,
      { ...item, sortOrder: prev.length },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity } : item)),
    );
  };

  const handleToggleOutlet = (outletId: string) => {
    setSelectedOutletIds((prev) =>
      prev.includes(outletId)
        ? prev.filter((id) => id !== outletId)
        : [...prev, outletId],
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error({ title: 'Nama paket harus diisi' });
      return;
    }
    if (items.length === 0) {
      toast.error({ title: 'Tambahkan minimal 1 item ke paket' });
      return;
    }

    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      price,
      costPrice: costPrice !== '' ? costPrice : undefined,
      isActive,
      items: items.map((item, idx) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        sortOrder: idx,
      })),
      outletIds: selectedOutletIds,
    };

    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Paket Bundle' : 'Tambah Paket Bundle'}
        description={isEdit ? 'Perbarui informasi paket bundle' : 'Buat paket bundle baru'}
      />

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Basic Info */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Informasi Paket</h3>

          <div>
            <label className="text-sm font-medium">Nama Paket *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="contoh: Paket Kombo A"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Deskripsi</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi opsional..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Harga Paket *</label>
              <Input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Harga Modal</label>
              <Input
                type="number"
                min={0}
                value={costPrice}
                onChange={(e) =>
                  setCostPrice(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="Opsional"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <label className="text-sm font-medium">Aktif</label>
          </div>
        </div>

        {/* Bundle Items */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Item Komponen</h3>
            <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Tambah Item
            </Button>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Belum ada item. Tambahkan produk ke paket bundle ini.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={`${item.productId}-${item.variantId}-${index}`}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.productName}</p>
                    {item.variantName && (
                      <Badge variant="secondary" className="text-xs mt-0.5">
                        {item.variantName}
                      </Badge>
                    )}
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      min={0.001}
                      step={1}
                      value={item.quantity}
                      onChange={(e) => handleUpdateQuantity(index, Number(e.target.value))}
                      className="h-8 text-center"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive"
                    onClick={() => handleRemoveItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Outlet Assignment */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Outlet</h3>
          <p className="text-sm text-muted-foreground">
            Pilih outlet yang menjual paket ini
          </p>
          <div className="space-y-2">
            {outlets.map((outlet) => (
              <label
                key={outlet.id}
                className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
              >
                <Checkbox
                  checked={selectedOutletIds.includes(outlet.id)}
                  onCheckedChange={() => handleToggleOutlet(outlet.id)}
                />
                <span className="text-sm">{outlet.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pb-8">
          <Button variant="outline" onClick={() => navigate('/app/bundle-packages')}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Paket'}
          </Button>
        </div>
      </div>

      <BundleItemPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onAdd={handleAddItem}
      />
    </div>
  );
}
