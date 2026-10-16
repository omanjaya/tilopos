import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  promotionsApi,
  businessDayStartIso,
  businessDayEndIso,
} from '@/api/endpoints/promotions.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { ErrorState } from '@/components/shared/error-state';
import { useCan } from '@/features/auth/use-permission';
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
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
import { formatCurrency, formatDate } from '@/lib/format';
import { Loader2, Wand2, Download } from 'lucide-react';
import type { GeneratedVoucher, DiscountType } from '@/types/promotion.types';

function getVoucherStatusBadge(voucher: GeneratedVoucher): { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' } {
  if (!voucher.isActive) {
    return { label: 'Nonaktif', variant: 'outline' };
  }
  // Each voucher code is single-use (usageCount is 0 or 1).
  if (voucher.usageCount > 0) {
    return { label: 'Terpakai', variant: 'secondary' };
  }
  const now = new Date();
  const validTo = new Date(voucher.validTo);
  if (validTo < now) {
    return { label: 'Kedaluwarsa', variant: 'destructive' };
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
  const [search, setSearch] = useState('');

  // Form state
  const [prefix, setPrefix] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const canGenerate = useCan('vouchers.generate');

  const { data: vouchers, isLoading, isError, error, refetch } = useQuery({
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
        // Business days (Asia/Jakarta): from 00:00 WIB until 23:59:59 WIB.
        validFrom: businessDayStartIso(validFrom),
        validTo: businessDayEndIso(validTo),
        // Every code is single-use; the shared promotion allows one use per code.
        usageLimit: quantity,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] });
      toast.success({ title: `${data.length} voucher berhasil dibuat` });
      setPrefix('');
      setQuantity(10);
      setDiscountValue(0);
      setValidFrom('');
      setValidTo('');
    },
    onError: (error) => handleMutationError(error, 'Gagal membuat voucher'),
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
      toast.success({ title: 'Voucher berhasil diekspor' });
    } catch (err) {
      console.warn('Voucher export failed', err);
      toast.error({
        title: 'Gagal mengekspor',
        description: 'Terjadi kesalahan saat mengekspor voucher',
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[A-Z0-9]{2,10}$/.test(prefix)) {
      toast.error({ title: 'Prefix harus 2-10 huruf kapital/angka' });
      return;
    }
    if (quantity < 1 || quantity > 1000) {
      toast.error({ title: 'Jumlah voucher harus 1-1000' });
      return;
    }
    if (!validFrom || !validTo) {
      toast.error({ title: 'Periode berlaku wajib diisi' });
      return;
    }
    if (validTo < validFrom) {
      toast.error({ title: 'Tanggal berakhir harus setelah tanggal mulai' });
      return;
    }
    if (discountValue <= 0) {
      toast.error({ title: 'Nilai diskon harus lebih dari 0' });
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
      header: 'Terpakai',
      cell: (row) => (
        <span className="text-sm">{row.usageCount > 0 ? 'Ya' : 'Belum'}</span>
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

      {canGenerate && (
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
            <p className="text-xs text-muted-foreground">
              Setiap kode voucher hanya dapat digunakan satu kali.
            </p>
        </CardContent>
      </Card>
      )}

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
      <DataTable
        columns={columns}
        data={vouchers ?? []}
        isLoading={isLoading}
        searchPlaceholder="Cari kode voucher..."
        onSearch={setSearch}
        emptyTitle="Belum ada voucher"
        emptyDescription="Buat voucher pertama Anda menggunakan form di atas."
      />
      )}
    </div>
  );
}
