import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '@/api/endpoints/inventory.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useTransferSocket } from '@/hooks/realtime/use-transfer-socket';
import { TransferTemplatesModal } from './components/transfer-templates-modal';
import { DirectTransferModal } from './components/direct-transfer-modal';
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
import { toast } from '@/lib/toast-utils';
import { formatDateTime } from '@/lib/format';
import {
  Plus,
  MoreHorizontal,
  Eye,
  CheckCircle,
  Truck,
  PackageCheck,
  BarChart3,
  FileText,
  Zap,
} from 'lucide-react';
import type { StockTransfer } from '@/types/inventory.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

const STATUS_CONFIG: Record<string, { label: string; variant: 'info' | 'warning' | 'secondary' | 'success' | 'destructive' }> = {
  requested: { label: 'Diminta', variant: 'info' },
  approved: { label: 'Disetujui', variant: 'warning' },
  shipped: { label: 'Dikirim', variant: 'secondary' },
  in_transit: { label: 'Dikirim', variant: 'secondary' },
  received: { label: 'Diterima', variant: 'success' },
  cancelled: { label: 'Dibatalkan', variant: 'destructive' },
};

export function TransfersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTransfers, setSelectedTransfers] = useState<StockTransfer[]>([]);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'ship' | 'bulk-approve';
    transfer?: StockTransfer;
  } | null>(null);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [directTransferOpen, setDirectTransferOpen] = useState(false);

  // Real-time WebSocket updates
  const { isConnected } = useTransferSocket({
    onStatusChange: () => {
      // Auto-refresh transfer list when status changes
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
    },
    showNotifications: true,
  });

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
      toast.success({ title: 'Transfer disetujui' });
      setConfirmAction(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menyetujui transfer',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const shipMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.shipTransfer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      toast.success({ title: 'Transfer ditandai dikirim' });
      setConfirmAction(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menandai pengiriman',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (transferIds: string[]) => {
      const results = await Promise.allSettled(
        transferIds.map((id) => inventoryApi.approveTransfer(id))
      );
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      if (successful > 0) {
        toast.success({
          title: `${successful} transfer disetujui`,
          description: failed > 0 ? `${failed} transfer gagal disetujui` : undefined,
        });
      }

      setSelectedTransfers([]);
      setConfirmAction(null);
    },
    onError: () => {
      toast.error({
        title: 'Gagal menyetujui transfer',
        description: 'Terjadi kesalahan saat bulk approve',
      });
    },
  });

  function handleConfirmAction() {
    if (!confirmAction) return;
    if (confirmAction.type === 'bulk-approve') {
      const transferIds = selectedTransfers.map((t) => t.id);
      bulkApproveMutation.mutate(transferIds);
    } else if (confirmAction.type === 'approve') {
      approveMutation.mutate(confirmAction.transfer!.id);
    } else {
      shipMutation.mutate(confirmAction.transfer!.id);
    }
  }

  const isAllSelected = !!transfers && transfers.length > 0 && selectedTransfers.length === transfers.length;
  const isSomeSelected = selectedTransfers.length > 0 && selectedTransfers.length < (transfers?.length || 0);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTransfers([]);
    } else {
      setSelectedTransfers(transfers || []);
    }
  };

  const toggleSelectTransfer = (transfer: StockTransfer) => {
    setSelectedTransfers((prev) =>
      prev.find((t) => t.id === transfer.id)
        ? prev.filter((t) => t.id !== transfer.id)
        : [...prev, transfer],
    );
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        navigate('/app/inventory/transfers/new');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  const columns: Column<StockTransfer>[] = [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={isAllSelected}
          indeterminate={isSomeSelected}
          onCheckedChange={toggleSelectAll}
          aria-label="Select all transfers"
        />
      ),
      cell: (row) => (
        <Checkbox
          checked={selectedTransfers.some((t) => t.id === row.id)}
          onCheckedChange={() => toggleSelectTransfer(row)}
          aria-label={`Select ${row.transferNumber}`}
        />
      ),
    },
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
        const config = STATUS_CONFIG[row.status] ?? { label: row.status, variant: 'secondary' as const };
        return <Badge variant={config.variant}>{config.label}</Badge>;
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
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Aksi transfer stok">
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

  const requestedCount = selectedTransfers.filter((t) => t.status === 'requested').length;

  return (
    <div>
      <PageHeader title="Transfer Stok" description="Kelola transfer stok antar outlet">
        {isConnected && (
          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
            <span className="inline-block h-2 w-2 rounded-full bg-success mr-2 animate-pulse" />
            Live Updates
          </Badge>
        )}
        {selectedTransfers.length > 0 && requestedCount > 0 && (
          <Button
            variant="default"
            onClick={() => setConfirmAction({ type: 'bulk-approve' })}
            className="bg-primary hover:bg-primary/90"
          >
            <CheckCircle className="mr-2 h-4 w-4" /> Setujui {requestedCount} Transfer
          </Button>
        )}
        <Button variant="outline" onClick={() => setTemplatesModalOpen(true)}>
          <FileText className="mr-2 h-4 w-4" /> Templates
        </Button>
        <Button variant="outline" onClick={() => navigate('/app/inventory/transfers/dashboard')}>
          <BarChart3 className="mr-2 h-4 w-4" /> Dashboard
        </Button>
        <Button variant="outline" onClick={() => setDirectTransferOpen(true)}>
          <Zap className="mr-2 h-4 w-4" /> Transfer Langsung
        </Button>
        <Button onClick={() => navigate('/app/inventory/transfers/new')} aria-keyshortcuts="N">
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
        emptyAction={
          <Button onClick={() => navigate('/app/inventory/transfers/new')}>
            <Plus className="mr-2 h-4 w-4" /> Buat Transfer Baru
          </Button>
        }
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
        title={
          confirmAction?.type === 'bulk-approve'
            ? 'Bulk Approve Transfer'
            : confirmAction?.type === 'approve'
              ? 'Setujui Transfer'
              : 'Kirim Transfer'
        }
        description={
          confirmAction?.type === 'bulk-approve'
            ? `Apakah Anda yakin ingin menyetujui ${requestedCount} transfer yang dipilih?`
            : confirmAction?.type === 'approve'
              ? `Apakah Anda yakin ingin menyetujui transfer ${confirmAction?.transfer?.transferNumber}?`
              : `Apakah Anda yakin ingin menandai transfer ${confirmAction?.transfer?.transferNumber} sebagai dikirim?`
        }
        confirmLabel={
          confirmAction?.type === 'bulk-approve'
            ? `Setujui ${requestedCount} Transfer`
            : confirmAction?.type === 'approve'
              ? 'Setujui'
              : 'Kirim'
        }
        onConfirm={handleConfirmAction}
        isLoading={approveMutation.isPending || shipMutation.isPending || bulkApproveMutation.isPending}
        variant="default"
      />

      <TransferTemplatesModal
        open={templatesModalOpen}
        onOpenChange={setTemplatesModalOpen}
      />

      <DirectTransferModal
        open={directTransferOpen}
        onOpenChange={setDirectTransferOpen}
      />
    </div>
  );
}
