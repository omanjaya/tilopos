import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionsApi } from '@/api/endpoints/promotions.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/format';
import { Loader2, Wand2, Download } from 'lucide-react';
import type { GeneratedVoucher, DiscountType } from '@/types/promotion.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

function getVoucherStatusBadge(voucher: GeneratedVoucher): { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' } {
  if (!voucher.isActive) {
    return { label: 'Nonaktif', variant: 'outline' };
  }
  if (voucher.usageCount >= voucher.usageLimit) {
    return { label: 'Habis', variant: 'secondary' };
  }
  const now = new Date();
  const validTo = new Date(voucher.validTo);
  if (validTo < now) {
    return { label: 'Kadaluarsa', variant: 'destructive' };
  }
  return { label: 'Aktif', variant: 'default' };
}

function getDiscountTypeLabel(type: DiscountType): string {
  switch (type) {
    case 'percentage':
      return 'Persentase';
    case 'fixed':
      return 'Nominal';
    case 'bogo':
      return 'BOGO';
    default:
      return type;
  }
}

export function VoucherGeneratorPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  // Form state
  const [prefix, setPrefix] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [usageLimit, setUsageLimit] = useState(1);

  const { data: vouchers, isLoading } = useQuery({
    queryKey: ['vouchers', search],
    queryFn: () => promotionsApi.listVouchers({ search: search || undefined }),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      promotionsApi.generateVouchers({
        prefix,
        quantity,
        discountType,
        discountValue,
        validFrom,
        validTo,
        usageLimit,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] });
      toast({ title: `${data.length} voucher berhasil dibuat` });
      setPrefix('');
      setQuantity(10);
      setDiscountValue(0);
      setValidFrom('');
      setValidTo('');
      setUsageLimit(1);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal membuat voucher',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const handleExport = async () => {
    try {
      const blob = await promotionsApi.exportVouchersCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vouchers.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Voucher berhasil diekspor' });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Gagal mengekspor',
        description: 'Terjadi kesalahan saat mengekspor voucher',
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prefix.trim()) {
      toast({ variant: 'destructive', title: 'Prefix wajib diisi' });
      return;
    }
    if (!validFrom || !validTo) {
      toast({ variant: 'destructive', title: 'Periode berlaku wajib diisi' });
      return;
    }
    if (discountValue <= 0) {
      toast({ variant: 'destructive', title: 'Nilai diskon harus lebih dari 0' });
      return;
    }
    generateMutation.mutate();
  };

  const columns: Column<GeneratedVoucher>[] = [
    {
      key: 'code',
      header: 'Kode Voucher',
      cell: (row) => <span className="font-mono font-medium">{row.code}</span>,
    },
    {
      key: 'discountType',
      header: 'Tipe Diskon',
      cell: (row) => (
        <Badge variant="secondary">{getDiscountTypeLabel(row.discountType)}</Badge>
      ),
    },
    {
      key: 'discountValue',
      header: 'Nilai Diskon',
      cell: (row) =>
        row.discountType === 'percentage'
          ? `${row.discountValue}%`
          : formatCurrency(row.discountValue),
    },
    {
      key: 'validPeriod',
      header: 'Masa Berlaku',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.validFrom)} - {formatDate(row.validTo)}
        </span>
      ),
    },
    {
      key: 'usage',
      header: 'Penggunaan',
      cell: (row) => (
        <span className="text-sm">
          {row.usageCount} / {row.usageLimit}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const status = getVoucherStatusBadge(row);
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
    {
      key: 'createdAt',
      header: 'Dibuat',
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.createdAt)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader title="Generator Voucher" description="Buat dan kelola kode voucher">
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Ekspor CSV
        </Button>
      </PageHeader>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Buat Voucher Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="prefix">Prefix Kode</Label>
                <Input
                  id="prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                  placeholder="Contoh: PROMO"
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Jumlah Voucher</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={1000}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountType">Tipe Diskon</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as DiscountType)}>
                  <SelectTrigger id="discountType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Persentase (%)</SelectItem>
                    <SelectItem value="fixed">Nominal (Rp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  Nilai Diskon {discountType === 'percentage' ? '(%)' : '(Rp)'}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  min={0}
                  max={discountType === 'percentage' ? 100 : undefined}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validFrom">Berlaku Dari</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validTo">Berlaku Sampai</Label>
                <Input
                  id="validTo"
                  type="date"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usageLimit">Batas Penggunaan per Voucher</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  min={1}
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={generateMutation.isPending}>
                {generateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Buat Voucher
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={vouchers ?? []}
        isLoading={isLoading}
        searchPlaceholder="Cari kode voucher..."
        onSearch={setSearch}
        emptyTitle="Belum ada voucher"
        emptyDescription="Buat voucher pertama Anda menggunakan form di atas."
      />
    </div>
  );
}
