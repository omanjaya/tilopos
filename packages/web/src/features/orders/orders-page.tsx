import { useState, useEffect } from 'react';
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
import { useUIStore } from '@/stores/ui.store';
import { formatDateTime } from '@/lib/format';
import { toast } from '@/lib/toast-utils';
import { useBusinessFeatures } from '@/hooks/use-business-features';
import { MoreHorizontal, Eye, Play, Check, HandPlatter, CheckCircle2, XCircle } from 'lucide-react';
import type { Order, OrderStatus } from '@/types/order.types';
import { useAuthStore } from '@/stores/auth.store';
import { ErrorState } from '@/components/shared/error-state';
import { orderStatusBadge, orderTypeBadge } from './order-labels';
import { CancelOrderDialog } from './components/cancel-order-dialog';
import { handleMutationError } from '@/lib/api-error-handler';

// 'all' = active orders (backend default); every other tab is a server-side status filter.
const STATUS_TABS: { value: 'all' | OrderStatus; label: string }[] = [
  { value: 'all', label: 'Semua Aktif' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'confirmed', label: 'Dikonfirmasi' },
  { value: 'preparing', label: 'Diproses' },
  { value: 'ready', label: 'Siap' },
  { value: 'served', label: 'Disajikan' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
];

type ForwardStatus = 'preparing' | 'ready' | 'served' | 'completed';

interface StatusAction {
  label: string;
  status: ForwardStatus | 'cancelled';
  variant: 'default' | 'destructive';
  icon: React.ReactNode;
}

function getActionsForStatus(currentStatus: string): StatusAction[] {
  switch (currentStatus) {
    case 'pending':
    case 'confirmed':
      return [
        { label: 'Proses', status: 'preparing', variant: 'default', icon: <Play className="mr-2 h-4 w-4" /> },
        { label: 'Batalkan', status: 'cancelled', variant: 'destructive', icon: <XCircle className="mr-2 h-4 w-4" /> },
      ];
    case 'preparing':
      return [
        { label: 'Tandai Siap', status: 'ready', variant: 'default', icon: <Check className="mr-2 h-4 w-4" /> },
        { label: 'Batalkan', status: 'cancelled', variant: 'destructive', icon: <XCircle className="mr-2 h-4 w-4" /> },
      ];
    case 'ready':
      return [
        { label: 'Tandai Disajikan', status: 'served', variant: 'default', icon: <HandPlatter className="mr-2 h-4 w-4" /> },
        { label: 'Batalkan', status: 'cancelled', variant: 'destructive', icon: <XCircle className="mr-2 h-4 w-4" /> },
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
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const userOutletId = useAuthStore((s) => s.user?.outletId);
  // No outlet selected → backend lists every outlet the caller may access.
  const outletId = selectedOutletId || userOutletId || undefined;
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [confirmAction, setConfirmAction] = useState<{ order: Order; action: StatusAction } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);

  // Feature checks
  const { hasTableManagement } = useBusinessFeatures();

  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ['orders', outletId ?? 'all', statusFilter],
    queryFn: () =>
      ordersApi.list({ outletId, status: statusFilter === 'all' ? undefined : statusFilter }),
    refetchInterval: 30000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ForwardStatus }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      const statusLabel = orderStatusBadge(variables.status).label;
      toast.success({
        title: 'Status pesanan diperbarui',
        description: `Pesanan "${confirmAction?.order.orderNumber}" telah diubah menjadi "${statusLabel}"`,
      });
      setConfirmAction(null);
    },
    onError: (error) => handleMutationError(error, 'Gagal memperbarui status pesanan'),
  });

  const columns: Column<Order>[] = [
    {
      key: 'orderNumber',
      header: 'No. Pesanan',
      cell: (row) => <span className="font-medium">{row.orderNumber}</span>,
    },
    // Table column - only show if table_management is enabled
    ...(hasTableManagement ? [{
      key: 'tableName',
      header: 'Meja',
      cell: (row: Order) => (
        <span className="text-muted-foreground">{row.tableName || '-'}</span>
      ),
    }] : []),
    {
      key: 'orderType',
      header: 'Tipe',
      cell: (row) => {
        const type = orderTypeBadge(row.orderType);
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
        const status = orderStatusBadge(row.status);
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
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
        if (actions.length === 0) {
          return (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Lihat detail"
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
                  onClick={() =>
                    action.status === 'cancelled'
                      ? setCancelTarget(row)
                      : setConfirmAction({ order: row, action })
                  }
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

  // Keyboard shortcuts for tab navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      // Number keys 1-5 for tab switching
      const tabMap: Record<string, 'all' | OrderStatus> = {
        '1': 'all',
        '2': 'pending',
        '3': 'preparing',
        '4': 'ready',
        '5': 'served',
      };

      const newFilter = tabMap[e.key];
      if (newFilter) {
        e.preventDefault();
        setStatusFilter(newFilter);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div>
      <PageHeader title="Pesanan" description="Kelola pesanan dapur">
        <HelpSidebar page="orders" />
      </PageHeader>

      <InlineHelpCard page="orders" className="mb-4" />

      <div className="mb-4">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | OrderStatus)}>
          <TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
      <DataTable
        columns={columns}
        data={orders}
        isLoading={isLoading}
        searchPlaceholder="Cari no. pesanan..."
        emptyTitle="Belum ada pesanan"
        emptyDescription="Pesanan akan muncul di sini setelah pelanggan memesan. Gunakan POS untuk membuat pesanan baru."
      />
      )}

      <CancelOrderDialog order={cancelTarget} onClose={() => setCancelTarget(null)} />

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        title="Ubah Status Pesanan"
        description={`Ubah status pesanan "${confirmAction?.order.orderNumber}" menjadi "${confirmAction?.action.label}"?`}
        confirmLabel={confirmAction?.action.label || 'Konfirmasi'}
        variant="default"
        onConfirm={() => {
          if (confirmAction && confirmAction.action.status !== 'cancelled') {
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
