import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/api/endpoints/orders.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { InlineHelpCard, HelpSidebar } from '@/components/shared/help-sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useUIStore } from '@/stores/ui.store';
import { formatDateTime } from '@/lib/format';
import { MoreHorizontal, Eye, Play, Check, HandPlatter, CheckCircle2, XCircle } from 'lucide-react';
import type { Order, OrderStatus } from '@/types/order.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

const STATUS_MAP: Record<OrderStatus, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
  pending: { label: 'Menunggu', variant: 'secondary' },
  preparing: { label: 'Diproses', variant: 'outline' },
  ready: { label: 'Siap', variant: 'default' },
  served: { label: 'Disajikan', variant: 'default' },
  completed: { label: 'Selesai', variant: 'default' },
  cancelled: { label: 'Dibatalkan', variant: 'destructive' },
};

const ORDER_TYPE_MAP: Record<string, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
  dine_in: { label: 'Dine In', variant: 'default' },
  take_away: { label: 'Take Away', variant: 'secondary' },
  takeaway: { label: 'Take Away', variant: 'secondary' },
  delivery: { label: 'Delivery', variant: 'outline' },
};

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'preparing', label: 'Diproses' },
  { value: 'ready', label: 'Siap' },
  { value: 'served', label: 'Disajikan' },
  { value: 'completed', label: 'Selesai' },
];

interface StatusAction {
  label: string;
  status: OrderStatus;
  variant: 'default' | 'destructive';
  icon: React.ReactNode;
}

function getActionsForStatus(currentStatus: OrderStatus): StatusAction[] {
  switch (currentStatus) {
    case 'pending':
      return [
        { label: 'Proses', status: 'preparing', variant: 'default', icon: <Play className="mr-2 h-4 w-4" /> },
        { label: 'Batalkan', status: 'cancelled', variant: 'destructive', icon: <XCircle className="mr-2 h-4 w-4" /> },
      ];
    case 'preparing':
      return [
        { label: 'Tandai Siap', status: 'ready', variant: 'default', icon: <Check className="mr-2 h-4 w-4" /> },
      ];
    case 'ready':
      return [
        { label: 'Tandai Disajikan', status: 'served', variant: 'default', icon: <HandPlatter className="mr-2 h-4 w-4" /> },
      ];
    case 'served':
      return [
        { label: 'Selesai', status: 'completed', variant: 'default', icon: <CheckCircle2 className="mr-2 h-4 w-4" /> },
      ];
    default:
      return [];
  }
}

export function OrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmAction, setConfirmAction] = useState<{ order: Order; action: StatusAction } | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', selectedOutletId, statusFilter],
    queryFn: () =>
      ordersApi.list({
        outletId: selectedOutletId || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
    refetchInterval: 30000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Status pesanan berhasil diperbarui' });
      setConfirmAction(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal memperbarui status',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const columns: Column<Order>[] = [
    {
      key: 'orderNumber',
      header: 'No. Pesanan',
      cell: (row) => <span className="font-medium">{row.orderNumber}</span>,
    },
    {
      key: 'tableName',
      header: 'Meja',
      cell: (row) => (
        <span className="text-muted-foreground">{row.tableName || '-'}</span>
      ),
    },
    {
      key: 'orderType',
      header: 'Tipe',
      cell: (row) => {
        const type = ORDER_TYPE_MAP[row.orderType] ?? { label: row.orderType, variant: 'secondary' as const };
        return <Badge variant={type.variant}>{type.label}</Badge>;
      },
    },
    {
      key: 'items',
      header: 'Items',
      cell: (row) => (
        <span className="text-muted-foreground">{(row.items ?? []).length} item</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const status = STATUS_MAP[row.status] ?? { label: row.status, variant: 'secondary' as const };
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
    {
      key: 'employeeName',
      header: 'Kasir',
      cell: (row) => row.employeeName,
    },
    {
      key: 'createdAt',
      header: 'Waktu',
      cell: (row) => (
        <span className="text-muted-foreground">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => {
        const actions = getActionsForStatus(row.status);
        if (actions.length === 0 && row.status !== 'pending' && row.status !== 'preparing' && row.status !== 'ready' && row.status !== 'served') {
          return (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate(`/app/orders/${row.id}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          );
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Aksi pesanan">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/app/orders/${row.id}`)}>
                <Eye className="mr-2 h-4 w-4" /> Lihat Detail
              </DropdownMenuItem>
              {actions.map((action) => (
                <DropdownMenuItem
                  key={action.status}
                  onClick={() => setConfirmAction({ order: row, action })}
                  className={action.variant === 'destructive' ? 'text-destructive' : ''}
                >
                  {action.icon} {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader title="Pesanan" description="Kelola pesanan dapur">
        <HelpSidebar page="orders" />
      </PageHeader>

      <InlineHelpCard page="orders" className="mb-4" />

      <div className="mb-4">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <DataTable
        columns={columns}
        data={orders ?? []}
        isLoading={isLoading}
        searchPlaceholder="Cari no. pesanan..."
        emptyTitle="Belum ada pesanan"
        emptyDescription="Pesanan akan muncul di sini setelah pelanggan memesan."
      />

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        title={
          confirmAction?.action.variant === 'destructive'
            ? 'Batalkan Pesanan'
            : 'Ubah Status Pesanan'
        }
        description={
          confirmAction?.action.variant === 'destructive'
            ? `Apakah Anda yakin ingin membatalkan pesanan "${confirmAction?.order.orderNumber}"? Tindakan ini tidak dapat dibatalkan.`
            : `Ubah status pesanan "${confirmAction?.order.orderNumber}" menjadi "${confirmAction?.action.label}"?`
        }
        confirmLabel={confirmAction?.action.label || 'Konfirmasi'}
        variant={confirmAction?.action.variant === 'destructive' ? 'destructive' : 'default'}
        onConfirm={() => {
          if (confirmAction) {
            updateStatusMutation.mutate({
              id: confirmAction.order.id,
              status: confirmAction.action.status,
            });
          }
        }}
        isLoading={updateStatusMutation.isPending}
      />
    </div>
  );
}
