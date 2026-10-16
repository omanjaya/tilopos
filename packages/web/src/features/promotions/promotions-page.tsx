import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionsApi } from '@/api/endpoints/promotions.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ErrorState } from '@/components/shared/error-state';
import { useCan } from '@/features/auth/use-permission';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/lib/toast-utils';
import { formatCurrency, formatDate } from '@/lib/format';
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { Promotion } from '@/types/promotion.types';
import { handleMutationError } from '@/lib/api-error-handler';

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

// GET /promotions only returns active promotions, so status is Aktif or Kedaluwarsa.
function getPromotionStatus(promo: Promotion): { label: string; className: string } {
  const now = new Date();
  const validUntil = new Date(promo.validUntil);
  if (validUntil < now) {
    return { label: 'Kedaluwarsa', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' };
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
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);
  const canWrite = useCan('promotions.write');

  // GET /promotions has no server-side search: fetch once, filter locally.
  const { data: allPromotions, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => promotionsApi.list(),
  });

  const promotions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allPromotions ?? [];
    return (allPromotions ?? []).filter(
      (p) => p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q),
    );
  }, [allPromotions, search]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => promotionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success({ title: 'Promosi dinonaktifkan' });
      setDeleteTarget(null);
    },
    onError: (error) => handleMutationError(error, 'Gagal menonaktifkan promosi'),
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
    ...(canWrite ? [{
      key: 'actions',
      header: '',
      cell: (row: Promotion) => (
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
              <Trash2 className="mr-2 h-4 w-4" /> Nonaktifkan
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }] : []),
  ];

  return (
    <div>
      <PageHeader title="Promosi" description="Kelola promosi dan diskon">
        {canWrite && (
          <Button onClick={() => navigate('/app/promotions/new')} aria-keyshortcuts="N">
            <Plus className="mr-2 h-4 w-4" /> Tambah Promosi
          </Button>
        )}
      </PageHeader>

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
      <DataTable
        columns={columns}
        data={promotions}
        isLoading={isLoading}
        searchPlaceholder="Cari promosi..."
        onSearch={setSearch}
        emptyTitle="Belum ada promosi"
        emptyDescription="Buat promosi dan diskon untuk menarik pelanggan dan meningkatkan penjualan."
        emptyAction={
          canWrite ? (
            <Button onClick={() => navigate('/app/promotions/new')}>
              <Plus className="mr-2 h-4 w-4" /> Tambah Promosi
            </Button>
          ) : undefined
        }
      />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Nonaktifkan Promosi"
        description={`Apakah Anda yakin ingin menonaktifkan promosi "${deleteTarget?.name}"? Promosi nonaktif tidak lagi muncul di daftar.`}
        confirmLabel="Nonaktifkan"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
