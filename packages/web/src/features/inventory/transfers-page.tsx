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
import { formatDateTime } from '@/lib/format';
import {
  Plus,
  MoreHorizontal,
  Eye,
  CheckCircle,
  Truck,
  PackageCheck,
} from 'lucide-react';
import type { StockTransfer } from '@/types/inventory.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  requested: { label: 'Diminta', className: 'bg-blue-500 hover:bg-blue-600' },
  approved: { label: 'Disetujui', className: 'bg-yellow-500 hover:bg-yellow-600' },
  shipped: { label: 'Dikirim', className: 'bg-purple-500 hover:bg-purple-600' },
  in_transit: { label: 'Dikirim', className: 'bg-purple-500 hover:bg-purple-600' },
  received: { label: 'Diterima', className: 'bg-green-500 hover:bg-green-600' },
  cancelled: { label: 'Dibatalkan', className: 'bg-red-500 hover:bg-red-600' },
};

export function TransfersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'ship';
    transfer: StockTransfer;
  } | null>(null);

  const { data: transfers, isLoading } = useQuery({
    queryKey: ['stock-transfers', statusFilter],
    queryFn: () =>
      inventoryApi.listTransfers({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.approveTransfer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      toast({ title: 'Transfer disetujui' });
      setConfirmAction(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal menyetujui transfer',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const shipMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.shipTransfer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      toast({ title: 'Transfer ditandai dikirim' });
      setConfirmAction(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal menandai pengiriman',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  function handleConfirmAction() {
    if (!confirmAction) return;
    if (confirmAction.type === 'approve') {
      approveMutation.mutate(confirmAction.transfer.id);
    } else {
      shipMutation.mutate(confirmAction.transfer.id);
    }
  }

  const columns: Column<StockTransfer>[] = [
    {
      key: 'transferNumber',
      header: 'No. Transfer',
      cell: (row) => (
        <button
          className="font-medium text-primary hover:underline"
          onClick={() => navigate(`/app/inventory/transfers/${row.id}`)}
        >
          {row.transferNumber}
        </button>
      ),
    },
    {
      key: 'source',
      header: 'Dari',
      cell: (row) => row.sourceOutletName,
    },
    {
      key: 'destination',
      header: 'Ke',
      cell: (row) => row.destinationOutletName,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const config = STATUS_CONFIG[row.status] ?? { label: row.status, className: '' };
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
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/app/inventory/transfers/${row.id}`)}>
              <Eye className="mr-2 h-4 w-4" /> Detail
            </DropdownMenuItem>
            {row.status === 'requested' && (
              <DropdownMenuItem onClick={() => setConfirmAction({ type: 'approve', transfer: row })}>
                <CheckCircle className="mr-2 h-4 w-4" /> Setujui
              </DropdownMenuItem>
            )}
            {row.status === 'approved' && (
              <DropdownMenuItem onClick={() => setConfirmAction({ type: 'ship', transfer: row })}>
                <Truck className="mr-2 h-4 w-4" /> Kirim
              </DropdownMenuItem>
            )}
            {(row.status === 'shipped' || row.status === 'in_transit') && (
              <DropdownMenuItem onClick={() => navigate(`/app/inventory/transfers/${row.id}`)}>
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
      <PageHeader title="Transfer Stok" description="Kelola transfer stok antar outlet">
        <Button onClick={() => navigate('/app/inventory/transfers/new')}>
          <Plus className="mr-2 h-4 w-4" /> Buat Transfer
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={transfers ?? []}
        isLoading={isLoading}
        searchPlaceholder="Cari transfer..."
        emptyTitle="Belum ada transfer"
        emptyDescription="Buat transfer stok pertama Anda."
        filters={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="requested">Diminta</SelectItem>
              <SelectItem value="approved">Disetujui</SelectItem>
              <SelectItem value="shipped">Dikirim</SelectItem>
              <SelectItem value="received">Diterima</SelectItem>
              <SelectItem value="cancelled">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.type === 'approve' ? 'Setujui Transfer' : 'Kirim Transfer'}
        description={
          confirmAction?.type === 'approve'
            ? `Apakah Anda yakin ingin menyetujui transfer ${confirmAction?.transfer.transferNumber}?`
            : `Apakah Anda yakin ingin menandai transfer ${confirmAction?.transfer.transferNumber} sebagai dikirim?`
        }
        confirmLabel={confirmAction?.type === 'approve' ? 'Setujui' : 'Kirim'}
        onConfirm={handleConfirmAction}
        isLoading={approveMutation.isPending || shipMutation.isPending}
        variant="default"
      />
    </div>
  );
}
