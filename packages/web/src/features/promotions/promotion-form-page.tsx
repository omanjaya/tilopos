import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionsApi } from '@/api/endpoints/promotions.api';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { CreatePromotionRequest, DiscountType } from '@/types/promotion.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

export function PromotionFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minPurchase, setMinPurchase] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [usageLimit, setUsageLimit] = useState('');

  const { data: promotion } = useQuery({
    queryKey: ['promotions', id],
    queryFn: () => promotionsApi.get(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (promotion) {
      setName(promotion.name);
      setDescription(promotion.description ?? '');
      setDiscountType(promotion.discountType);
      setDiscountValue(String(promotion.discountValue));
      setMinPurchase(promotion.minPurchase !== null ? String(promotion.minPurchase) : '');
      setMaxDiscount(promotion.maxDiscount !== null ? String(promotion.maxDiscount) : '');
      setValidFrom(promotion.validFrom.slice(0, 10));
      setValidUntil(promotion.validUntil.slice(0, 10));
      setUsageLimit(promotion.usageLimit !== null ? String(promotion.usageLimit) : '');
    }
  }, [promotion]);

  const createMutation = useMutation({
    mutationFn: (data: CreatePromotionRequest) => promotionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast({ title: 'Promosi berhasil dibuat' });
      navigate('/app/promotions');
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreatePromotionRequest>) => promotionsApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast({ title: 'Promosi berhasil diperbarui' });
      navigate('/app/promotions');
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: CreatePromotionRequest = {
      name,
      description: description || undefined,
      discountType,
      discountValue: Number(discountValue),
      minPurchase: minPurchase ? Number(minPurchase) : undefined,
      maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
      validFrom,
      validUntil,
      usageLimit: usageLimit ? Number(usageLimit) : undefined,
    };

    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Promosi' : 'Tambah Promosi'}>
        <Button variant="outline" onClick={() => navigate('/app/promotions')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Detail Promosi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Promosi</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Diskon Akhir Tahun"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Deskripsi promosi (opsional)"
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="discountType">Tipe Diskon</Label>
                <Select
                  value={discountType}
                  onValueChange={(v) => setDiscountType(v as DiscountType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe diskon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Persentase</SelectItem>
                    <SelectItem value="fixed">Nominal</SelectItem>
                    <SelectItem value="bogo">BOGO (Buy 1 Get 1)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  Nilai Diskon {discountType === 'percentage' ? '(%)' : discountType === 'fixed' ? '(Rp)' : ''}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  min="0"
                  max={discountType === 'percentage' ? '100' : undefined}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'percentage' ? 'Contoh: 10' : 'Contoh: 50000'}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="minPurchase">Minimum Pembelian (Rp)</Label>
                <Input
                  id="minPurchase"
                  type="number"
                  min="0"
                  value={minPurchase}
                  onChange={(e) => setMinPurchase(e.target.value)}
                  placeholder="Opsional"
                />
              </div>

              {discountType === 'percentage' && (
                <div className="space-y-2">
                  <Label htmlFor="maxDiscount">Maksimum Diskon (Rp)</Label>
                  <Input
                    id="maxDiscount"
                    type="number"
                    min="0"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    placeholder="Opsional"
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="validFrom">Berlaku Dari</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validUntil">Berlaku Sampai</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="usageLimit">Batas Penggunaan</Label>
              <Input
                id="usageLimit"
                type="number"
                min="0"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder="Kosongkan untuk tidak ada batas"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/app/promotions')}>
            Batal
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            {isEdit ? 'Simpan Perubahan' : 'Buat Promosi'}
          </Button>
        </div>
      </form>
    </div>
  );
}
