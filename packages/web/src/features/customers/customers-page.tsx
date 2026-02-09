import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/api/endpoints/customers.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { InlineHelpCard, HelpSidebar } from '@/components/shared/help-sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency } from '@/lib/format';
import { toast } from '@/lib/toast-utils';
import { useBusinessFeatures } from '@/hooks/use-business-features';
import { Plus, MoreHorizontal, Pencil, Trash2, Star } from 'lucide-react';
import type { Customer } from '@/types/customer.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

export function CustomersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  // Feature checks
  const { hasCustomerLoyalty } = useBusinessFeatures();

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () =>
      customersApi.list({
        search: search || undefined,
      }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => customersApi.update(id, { isActive: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success({
        title: 'Pelanggan dinonaktifkan',
        description: `"${deleteTarget?.name}" telah dinonaktifkan`,
      });
      setDeleteTarget(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menonaktifkan pelanggan',
        description: error.response?.data?.message || 'Terjadi kesalahan saat menonaktifkan pelanggan',
      });
    },
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
    {
      key: 'status',
      header: 'Status',
      cell: (row) =>
        row.isActive ? (
          <Badge variant="default">Aktif</Badge>
        ) : (
          <Badge variant="outline">Nonaktif</Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
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
              <Trash2 className="mr-2 h-4 w-4" /> Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        navigate('/app/customers/new');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  return (
    <div>
      <PageHeader title="Pelanggan" description="Kelola data pelanggan Anda">
        <HelpSidebar page="customers" />
        <Button onClick={() => navigate('/app/customers/new')} aria-keyshortcuts="N">
          <Plus className="mr-2 h-4 w-4" /> Tambah Pelanggan
        </Button>
      </PageHeader>

      <InlineHelpCard page="customers" className="mb-4" />

      <DataTable
        columns={columns}
        data={customersData ?? []}
        isLoading={isLoading}
        searchPlaceholder="Cari pelanggan..."
        onSearch={setSearch}
        emptyTitle="Belum ada pelanggan"
        emptyDescription="Mulai membangun database pelanggan Anda untuk tracking loyalitas dan riwayat pembelian."
        emptyAction={
          <Button onClick={() => navigate('/app/customers/new')}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Pelanggan Pertama
          </Button>
        }
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Pelanggan"
        description={`Apakah Anda yakin ingin menonaktifkan "${deleteTarget?.name}"? Pelanggan akan ditandai sebagai nonaktif.`}
        confirmLabel="Hapus"
        onConfirm={() => deleteTarget && deactivateMutation.mutate(deleteTarget.id)}
        isLoading={deactivateMutation.isPending}
      />
    </div>
  );
}
