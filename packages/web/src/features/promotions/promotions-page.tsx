import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionsApi } from '@/api/endpoints/promotions.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/format';
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { Promotion } from '@/types/promotion.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

function getDiscountTypeLabel(type: string): string {
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

function getDiscountTypeBadgeVariant(type: string): 'default' | 'secondary' | 'outline' {
  switch (type) {
    case 'percentage':
      return 'default';
    case 'fixed':
      return 'secondary';
    case 'bogo':
      return 'outline';
    default:
      return 'secondary';
  }
}

function getPromotionStatus(promo: Promotion): { label: string; className: string } {
  if (!promo.isActive) {
    return { label: 'Nonaktif', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' };
  }
  const now = new Date();
  const validUntil = new Date(promo.validUntil);
  if (validUntil < now) {
    return { label: 'Kadaluarsa', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' };
  }
  return { label: 'Aktif', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' };
}

function formatDiscountValue(promo: Promotion): string {
  if (promo.discountType === 'percentage') {
    return `${promo.discountValue}%`;
  }
  if (promo.discountType === 'bogo') {
    return 'Buy 1 Get 1';
  }
  return formatCurrency(promo.discountValue);
}

export function PromotionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);

  const { data: promotions, isLoading } = useQuery({
    queryKey: ['promotions', search],
    queryFn: () => promotionsApi.list({ search: search || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => promotionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast({ title: 'Promosi dinonaktifkan' });
      setDeleteTarget(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal menghapus',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const columns: Column<Promotion>[] = [
    {
      key: 'name',
      header: 'Nama',
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'discountType',
      header: 'Tipe Diskon',
      cell: (row) => (
        <Badge variant={getDiscountTypeBadgeVariant(row.discountType)}>
          {getDiscountTypeLabel(row.discountType)}
        </Badge>
      ),
    },
    {
      key: 'discountValue',
      header: 'Nilai Diskon',
      cell: (row) => formatDiscountValue(row),
    },
    {
      key: 'validPeriod',
      header: 'Berlaku',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.validFrom)} - {formatDate(row.validUntil)}
        </span>
      ),
    },
    {
      key: 'usage',
      header: 'Penggunaan',
      cell: (row) => (
        <span className="text-sm">
          {row.usageCount}
          {row.usageLimit !== null ? ` / ${row.usageLimit}` : ''}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const status = getPromotionStatus(row);
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}
          >
            {status.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Aksi promosi">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/app/promotions/${row.id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteTarget(row)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Promosi" description="Kelola promosi dan diskon">
        <Button onClick={() => navigate('/app/promotions/new')}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Promosi
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={promotions ?? []}
        isLoading={isLoading}
        searchPlaceholder="Cari promosi..."
        onSearch={setSearch}
        emptyTitle="Belum ada promosi"
        emptyDescription="Tambahkan promosi pertama Anda."
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Promosi"
        description={`Apakah Anda yakin ingin menonaktifkan promosi "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
