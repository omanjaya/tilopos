import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/api/endpoints/customers.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ErrorState } from '@/components/shared/error-state';
import { InlineHelpCard, HelpSidebar } from '@/components/shared/help-sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency } from '@/lib/format';
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
import { usePaginatedList } from '@/hooks/use-paginated-list';
import { useBusinessFeatures } from '@/hooks/use-business-features';
import { useCan } from '@/features/auth/use-permission';
import { Plus, MoreHorizontal, Pencil, Trash2, Star, FileSpreadsheet } from 'lucide-react';
import type { Customer } from '@/types/customer.types';

export function CustomersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  // Feature checks
  const { hasCustomerLoyalty } = useBusinessFeatures();
  const canWrite = useCan('customers.write');
  const canImport = useCan('customers.import');
  // POST /customers also allows cashiers (edit/delete stay supervisor+)
  const canCreate = useCan('customers.create');

  const { data: customersData, isLoading, error, refetch, pagination, sort, setSearch } = usePaginatedList<Customer>({
    queryKey: ['customers'],
    queryFn: (params) => customersApi.listPaginated(params),
    defaultLimit: 15,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => customersApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success({
        title: 'Pelanggan dinonaktifkan',
        description: `"${deleteTarget?.name}" telah dinonaktifkan`,
      });
      setDeleteTarget(null);
    },
    onError: (error) => handleMutationError(error, 'Gagal menonaktifkan pelanggan'),
  });

  const columns: Column<Customer>[] = [
    { key: 'name', header: 'Nama', cell: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'email', header: 'Email', cell: (row) => <span className="text-muted-foreground">{row.email ?? '-'}</span> },
    { key: 'phone', header: 'Telepon', cell: (row) => <span className="text-muted-foreground">{row.phone ?? '-'}</span> },
    { key: 'totalSpent', header: 'Total Belanja', cell: (row) => formatCurrency(row.totalSpent) },
    { key: 'visitCount', header: 'Kunjungan', cell: (row) => row.visitCount },
    // Loyalty points - only show if customer_loyalty is enabled
    ...(hasCustomerLoyalty ? [{
      key: 'loyaltyPoints',
      header: (
        <span className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 text-yellow-500" /> Poin
        </span>
      ),
      cell: (row: Customer) => (
        <span className="font-medium text-yellow-600 dark:text-yellow-500">
          {row.loyaltyPoints.toLocaleString('id-ID')}
        </span>
      ),
    }] : []),
    ...(canWrite ? [{
      key: 'actions',
      header: '',
      cell: (row: Customer) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Aksi pelanggan">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/app/customers/${row.id}/edit`)}>
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
      <PageHeader title="Pelanggan" description="Kelola data pelanggan Anda">
        <HelpSidebar page="customers" />
        {canImport && (
          <Button variant="outline" onClick={() => navigate('/app/import?type=customers')}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Import Excel
          </Button>
        )}
        {canCreate && (
          <Button onClick={() => navigate('/app/customers/new')} aria-keyshortcuts="N">
            <Plus className="mr-2 h-4 w-4" /> Tambah Pelanggan
          </Button>
        )}
      </PageHeader>

      <InlineHelpCard page="customers" className="mb-4" />

      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
      <DataTable
        columns={columns}
        data={customersData}
        isLoading={isLoading}
        searchPlaceholder="Cari pelanggan..."
        onSearch={setSearch}
        pagination={pagination}
        sort={sort}
        emptyTitle="Belum ada pelanggan"
        emptyDescription="Mulai membangun database pelanggan Anda untuk tracking loyalitas dan riwayat pembelian."
        emptyAction={
          canCreate || canImport ? (
            <div className="flex gap-2">
              {canCreate && (
                <Button onClick={() => navigate('/app/customers/new')}>
                  <Plus className="mr-2 h-4 w-4" /> Tambah Pelanggan
                </Button>
              )}
              {canImport && (
                <Button variant="outline" onClick={() => navigate('/app/import?type=customers')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Import Excel
                </Button>
              )}
            </div>
          ) : undefined
        }
      />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Nonaktifkan Pelanggan"
        description={`Apakah Anda yakin ingin menonaktifkan "${deleteTarget?.name}"? Pelanggan nonaktif tidak lagi muncul di daftar.`}
        confirmLabel="Nonaktifkan"
        onConfirm={() => deleteTarget && deactivateMutation.mutate(deleteTarget.id)}
        isLoading={deactivateMutation.isPending}
      />
    </div>
  );
}
