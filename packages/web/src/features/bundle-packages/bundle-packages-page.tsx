import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bundlePackagesApi } from '@/api/endpoints/bundle-packages.api';
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
import { formatCurrency } from '@/lib/format';
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
import { Plus, MoreHorizontal, Pencil, Trash2, Package } from 'lucide-react';
import type { BundlePackage } from '@/types/bundle.types';

export function BundlePackagesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<BundlePackage | null>(null);

  const { data: bundles, isLoading } = useQuery({
    queryKey: ['bundle-packages', search],
    queryFn: () => bundlePackagesApi.list({ search: search || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bundlePackagesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bundle-packages'] });
      toast.success({
        title: 'Paket bundle berhasil dihapus',
        description: `"${deleteTarget?.name}" telah dinonaktifkan`,
      });
      setDeleteTarget(null);
    },
    onError: (error) => handleMutationError(error, 'Gagal menghapus paket bundle'),
  });

  const columns: Column<BundlePackage>[] = [
    {
      key: 'image',
      header: '',
      cell: (row) =>
        row.imageUrl ? (
          <img src={row.imageUrl} alt={row.name} loading="lazy" className="h-10 w-10 rounded-md object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Package className="h-5 w-5" />
          </div>
        ),
    },
    {
      key: 'name',
      header: 'Nama Paket',
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'price',
      header: 'Harga',
      cell: (row) => formatCurrency(row.price),
    },
    {
      key: 'items',
      header: 'Jumlah Item',
      cell: (row) => (
        <Badge variant="secondary">{row.items.length} item</Badge>
      ),
    },
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
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Aksi paket">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/app/bundle-packages/${row.id}/edit`)}>
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
      <PageHeader title="Paket Bundle" description="Kelola paket bundle produk">
        <Button onClick={() => navigate('/app/bundle-packages/new')}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Paket
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={bundles ?? []}
        isLoading={isLoading}
        searchPlaceholder="Cari paket bundle..."
        onSearch={setSearch}
        emptyTitle="Belum ada paket bundle"
        emptyDescription="Buat paket bundle pertama Anda untuk menggabungkan beberapa produk menjadi satu paket."
        emptyAction={
          <Button onClick={() => navigate('/app/bundle-packages/new')}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Paket Bundle
          </Button>
        }
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Paket Bundle"
        description={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}"? Paket akan dinonaktifkan dan tidak muncul di POS.`}
        confirmLabel="Hapus"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
