import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '@/api/endpoints/inventory.api';
import { outletsApi } from '@/api/endpoints/outlets.api';
import { productsApi } from '@/api/endpoints/products.api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import type { TransferTemplate } from '@/types/transfer-template.types';
import type { AxiosError } from 'axios';

interface TransferTemplateFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: TransferTemplate | null;
}

interface TemplateItemForm {
  id: string;
  productId: string;
  productName: string;
  defaultQuantity: string;
}

export function TransferTemplateFormModal({
  open,
  onOpenChange,
  template,
}: TransferTemplateFormModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceOutletId, setSourceOutletId] = useState('');
  const [destinationOutletId, setDestinationOutletId] = useState('');
  const [items, setItems] = useState<TemplateItemForm[]>([
    { id: '1', productId: '', productName: '', defaultQuantity: '1' },
  ]);

  const { data: outlets } = useQuery({
    queryKey: ['outlets'],
    queryFn: () => outletsApi.list(),
    enabled: open,
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list(),
    enabled: open,
  });

  useEffect(() => {
    if (template && open) {
      setName(template.name);
      setDescription(template.description || '');
      setSourceOutletId(template.sourceOutletId);
      setDestinationOutletId(template.destinationOutletId);
      setItems(
        template.items.map((item, idx) => ({
          id: String(idx + 1),
          productId: item.productId || '',
          productName: item.itemName,
          defaultQuantity: String(item.defaultQuantity),
        }))
      );
    } else if (!open) {
      // Reset form when closed
      setName('');
      setDescription('');
      setSourceOutletId('');
      setDestinationOutletId('');
      setItems([{ id: '1', productId: '', productName: '', defaultQuantity: '1' }]);
    }
  }, [template, open]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (template) {
        return inventoryApi.updateTransferTemplate(template.id, data);
      }
      return inventoryApi.createTransferTemplate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer-templates'] });
      toast({
        title: template ? 'Template diperbarui' : 'Template dibuat',
      });
      onOpenChange(false);
    },
    onError: (error: AxiosError<any>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal menyimpan template',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: String(items.length + 1),
        productId: '',
        productName: '',
        defaultQuantity: '1',
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof TemplateItemForm, value: string) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          if (field === 'productId') {
            const product = products?.find((p) => p.id === value);
            return {
              ...item,
              productId: value,
              productName: product?.name || '',
            };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nama template wajib diisi',
      });
      return;
    }

    if (!sourceOutletId || !destinationOutletId) {
      toast({
        variant: 'destructive',
        title: 'Pilih outlet asal dan tujuan',
      });
      return;
    }

    if (sourceOutletId === destinationOutletId) {
      toast({
        variant: 'destructive',
        title: 'Outlet asal dan tujuan harus berbeda',
      });
      return;
    }

    const validItems = items.filter((item) => item.productId && Number(item.defaultQuantity) > 0);

    if (validItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Tambahkan minimal 1 produk',
      });
      return;
    }

    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      sourceOutletId,
      destinationOutletId,
      items: validItems.map((item) => ({
        productId: item.productId,
        itemName: item.productName,
        defaultQuantity: Number(item.defaultQuantity),
      })),
    };

    saveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Template' : 'Buat Template Baru'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nama Template *</Label>
            <Input
              id="name"
              placeholder="e.g., Weekly Restock from Warehouse"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="description">Deskripsi (opsional)</Label>
            <Textarea
              id="description"
              placeholder="Jelaskan tujuan template ini..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sourceOutlet">Outlet Asal *</Label>
              <Select value={sourceOutletId} onValueChange={setSourceOutletId}>
                <SelectTrigger id="sourceOutlet">
                  <SelectValue placeholder="Pilih outlet" />
                </SelectTrigger>
                <SelectContent>
                  {outlets?.map((outlet) => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="destOutlet">Outlet Tujuan *</Label>
              <Select value={destinationOutletId} onValueChange={setDestinationOutletId}>
                <SelectTrigger id="destOutlet">
                  <SelectValue placeholder="Pilih outlet" />
                </SelectTrigger>
                <SelectContent>
                  {outlets
                    ?.filter((outlet) => outlet.id !== sourceOutletId)
                    .map((outlet) => (
                      <SelectItem key={outlet.id} value={outlet.id}>
                        {outlet.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Items *</Label>
              <Button size="sm" variant="outline" onClick={handleAddItem}>
                <Plus className="h-3 w-3 mr-1" /> Tambah Item
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex gap-2">
                  <Select
                    value={item.productId}
                    onValueChange={(value) => handleItemChange(item.id, 'productId', value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Pilih produk" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    min="1"
                    className="w-24"
                    placeholder="Qty"
                    value={item.defaultQuantity}
                    onChange={(e) => handleItemChange(item.id, 'defaultQuantity', e.target.value)}
                  />

                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {template ? 'Perbarui' : 'Buat'} Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
