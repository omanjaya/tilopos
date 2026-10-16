import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  inventoryApi,
  type PurchaseOrderStatus,
  type PurchaseOrderView as PurchaseOrder,
} from '@/api/endpoints/inventory.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ErrorState } from '@/components/shared/error-state';
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
import { toast } from '@/lib/toast-utils';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { Plus, MoreHorizontal, Eye, PackageCheck, CheckCircle } from 'lucide-react';
import { handleMutationError } from '@/lib/api-error-handler';
import { useAuthStore } from '@/stores/auth.store';
import { hasRole } from '@/config/permissions';
import { PurchaseOrderFormModal } from './components/purchase-order-form-modal';
import { PurchaseOrderDetailModal } from './components/purchase-order-detail-modal';

/** Labels for the backend PurchaseOrderStatus enum. */
const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; className: string }> = {
  draft: { label: 'Draf', className: '' },
  ordered: { label: 'Dipesan', className: 'bg-blue-500 hover:bg-blue-600' },
  partial: { label: 'Diterima Sebagian', className: 'bg-amber-500 hover:bg-amber-600' },
  received: { label: 'Diterima', className: 'bg-green-500 hover:bg-green-600' },
  cancelled: { label: 'Dibatalkan', className: 'bg-red-500 hover:bg-red-600' },
};

function statusConfig(status: string) {
  return STATUS_CONFIG[status as PurchaseOrderStatus] ?? { label: status, className: '' };
}

type ConfirmAction = { type: 'approve' | 'receive'; po: PurchaseOrder };

export function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  // Backend @Roles: create/receive = MANAGER/OWNER/INVENTORY, approve = MANAGER/OWNER.
  const canManage = hasRole(user?.role, 'STOCK');
  const canApprove = hasRole(user?.role, 'MANAGEMENT');

  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | 'all'>('all');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailPo, setDetailPo] = useState<PurchaseOrder | null>(null);

  const { data: purchaseOrders, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['purchase-orders', statusFilter],
    queryFn: () =>
      inventoryApi.listPurchaseOrders({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const receiveMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.receivePurchaseOrder(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
      toast.success({
        title: result.status === 'partial' ? 'PO diterima sebagian' : 'PO berhasil diterima',
      });
      setConfirmAction(null);
    },
    onError: (err) => handleMutationError(err, 'Gagal menerima PO'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.approvePurchaseOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success({ title: 'PO disetujui dan ditandai dipesan' });
      setConfirmAction(null);
    },
    onError: (err) => handleMutationError(err, 'Gagal menyetujui PO'),
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
        const config = statusConfig(row.status);
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
            <DropdownMenuItem onClick={() => setDetailPo(row)}>
              <Eye className="mr-2 h-4 w-4" /> Detail
            </DropdownMenuItem>
            {row.status === 'draft' && canApprove && (
              <DropdownMenuItem onClick={() => setConfirmAction({ type: 'approve', po: row })}>
                <CheckCircle className="mr-2 h-4 w-4" /> Setujui
              </DropdownMenuItem>
            )}
            {(row.status === 'ordered' || row.status === 'partial') && canManage && (
              <DropdownMenuItem onClick={() => setConfirmAction({ type: 'receive', po: row })}>
                <PackageCheck className="mr-2 h-4 w-4" /> Terima
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const isApprove = confirmAction?.type === 'approve';

  return (
    <div>
      <PageHeader title="Purchase Order" description="Kelola pemesanan barang dari supplier">
        {canManage && (
          <Button onClick={() => setCreateOpen(true)} aria-keyshortcuts="N">
            <Plus className="mr-2 h-4 w-4" /> Buat PO
          </Button>
        )}
      </PageHeader>

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={purchaseOrders ?? []}
          isLoading={isLoading}
          emptyTitle="Belum ada purchase order"
          emptyDescription="Buat purchase order untuk memesan barang dari supplier dan mengelola stok masuk."
          emptyAction={
            canManage ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Buat PO
              </Button>
            ) : undefined
          }
          filters={
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as PurchaseOrderStatus | 'all')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {(Object.keys(STATUS_CONFIG) as PurchaseOrderStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      )}
      {!isError && (purchaseOrders?.length ?? 0) >= 100 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Menampilkan 100 purchase order terbaru. Gunakan filter status untuk mempersempit hasil.
        </p>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={isApprove ? 'Setujui Purchase Order' : 'Terima Purchase Order'}
        description={
          isApprove
            ? `Setujui PO "${confirmAction?.po.poNumber}" dan tandai sebagai dipesan?`
            : `Terima semua sisa barang pada PO "${confirmAction?.po.poNumber}"? Stok outlet akan bertambah.`
        }
        confirmLabel={isApprove ? 'Setujui' : 'Terima'}
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.type === 'approve') approveMutation.mutate(confirmAction.po.id);
          else receiveMutation.mutate(confirmAction.po.id);
        }}
        isLoading={receiveMutation.isPending || approveMutation.isPending}
        variant="default"
      />

      <PurchaseOrderFormModal open={createOpen} onOpenChange={setCreateOpen} />

      <PurchaseOrderDetailModal
        purchaseOrder={detailPo}
        outletName={detailPo?.outletName ?? '-'}
        statusLabel={detailPo ? statusConfig(detailPo.status).label : ''}
        onOpenChange={(open) => !open && setDetailPo(null)}
      />
    </div>
  );
}
