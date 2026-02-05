import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '@/api/endpoints/inventory.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { Plus, MoreHorizontal, Eye, PackageCheck } from 'lucide-react';
import type { PurchaseOrder } from '@/types/inventory.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

type POStatus = PurchaseOrder['status'];

const STATUS_CONFIG: Record<POStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: '' },
  ordered: { label: 'Dipesan', className: 'bg-blue-500 hover:bg-blue-600' },
  received: { label: 'Diterima', className: 'bg-green-500 hover:bg-green-600' },
  cancelled: { label: 'Dibatalkan', className: 'bg-red-500 hover:bg-red-600' },
};

export function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [receiveTarget, setReceiveTarget] = useState<PurchaseOrder | null>(null);

  const { data: purchaseOrders, isLoading } = useQuery({
    queryKey: ['purchase-orders', statusFilter],
    queryFn: () =>
      inventoryApi.listPurchaseOrders({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const receiveMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.receivePurchaseOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ title: 'PO berhasil diterima' });
      setReceiveTarget(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal menerima PO',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const columns: Column<PurchaseOrder>[] = [
    {
      key: 'poNumber',
      header: 'No. PO',
      cell: (row) => <span className="font-medium">{row.poNumber}</span>,
    },
    {
      key: 'supplier',
      header: 'Supplier',
      cell: (row) => row.supplierName,
    },
    {
      key: 'outlet',
      header: 'Outlet',
      cell: (row) => row.outletName,
    },
    {
      key: 'total',
      header: 'Total',
      cell: (row) => <span className="font-medium">{formatCurrency(row.totalAmount)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const config = STATUS_CONFIG[row.status];
        if (row.status === 'draft') {
          return <Badge variant="secondary">{config.label}</Badge>;
        }
        return <Badge className={config.className}>{config.label}</Badge>;
      },
    },
    {
      key: 'date',
      header: 'Tanggal',
      cell: (row) => <span className="text-muted-foreground">{formatDateTime(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Aksi pesanan pembelian">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/app/inventory/purchase-orders/${row.id}`)}>
              <Eye className="mr-2 h-4 w-4" /> Detail
            </DropdownMenuItem>
            {row.status === 'ordered' && (
              <DropdownMenuItem onClick={() => setReceiveTarget(row)}>
                <PackageCheck className="mr-2 h-4 w-4" /> Terima
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Purchase Order" description="Kelola pemesanan barang dari supplier">
        <Button onClick={() => navigate('/app/inventory/purchase-orders/new')}>
          <Plus className="mr-2 h-4 w-4" /> Buat PO
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={purchaseOrders ?? []}
        isLoading={isLoading}
        searchPlaceholder="Cari purchase order..."
        emptyTitle="Belum ada purchase order"
        emptyDescription="Buat purchase order pertama Anda."
        filters={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="ordered">Dipesan</SelectItem>
              <SelectItem value="received">Diterima</SelectItem>
              <SelectItem value="cancelled">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <ConfirmDialog
        open={!!receiveTarget}
        onOpenChange={(open) => !open && setReceiveTarget(null)}
        title="Terima Purchase Order"
        description={`Apakah Anda yakin ingin menandai PO "${receiveTarget?.poNumber}" sebagai diterima?`}
        confirmLabel="Terima"
        onConfirm={() => receiveTarget && receiveMutation.mutate(receiveTarget.id)}
        isLoading={receiveMutation.isPending}
        variant="default"
      />
    </div>
  );
}
