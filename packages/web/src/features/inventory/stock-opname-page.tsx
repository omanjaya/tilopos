import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockOpnameApi } from '@/api/endpoints/stock-opname.api';
import { useAuthStore } from '@/stores/auth.store';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/lib/toast-utils';
import { formatDateTime } from '@/lib/format';
import { Plus, MoreHorizontal, Eye, XCircle, ClipboardCheck, Loader2 } from 'lucide-react';
import { handleMutationError } from '@/lib/api-error-handler';
import type { StockOpname, StockOpnameStatus } from '@/types/stock-opname.types';

const STATUS_CONFIG: Record<StockOpnameStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  in_progress: { label: 'Berlangsung', variant: 'warning' },
  completed: { label: 'Selesai', variant: 'success' },
  cancelled: { label: 'Dibatalkan', variant: 'destructive' },
};

export function StockOpnamePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [createNotes, setCreateNotes] = useState('');
  const [cancelTarget, setCancelTarget] = useState<StockOpname | null>(null);

  const { data: opnames, isLoading } = useQuery({
    queryKey: ['stock-opname', statusFilter],
    queryFn: () =>
      stockOpnameApi.list({
        outletId: user?.outletId || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: stockOpnameApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname'] });
      toast.success({ title: 'Stock opname berhasil dibuat' });
      setShowCreate(false);
      setCreateNotes('');
      if (data?.id) navigate(`/app/inventory/stock-opname/${data.id}`);
    },
    onError: (error) => handleMutationError(error, 'Gagal membuat stock opname'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => stockOpnameApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname'] });
      toast.success({ title: 'Stock opname dibatalkan' });
      setCancelTarget(null);
    },
    onError: (error) => handleMutationError(error, 'Gagal membatalkan stock opname'),
  });

  const columns: Column<StockOpname>[] = [
    {
      key: 'opnameNumber',
      header: 'No. Opname',
      cell: (row) => <span className="font-medium">{row.opnameNumber}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const config = STATUS_CONFIG[row.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: 'outlet',
      header: 'Outlet',
      cell: (row) => row.outlet?.name || '-',
    },
    {
      key: 'progress',
      header: 'Progress',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.countedCount}/{row.itemCount} dihitung
        </span>
      ),
    },
    {
      key: 'discrepancy',
      header: 'Selisih',
      cell: (row) =>
        row.discrepancyCount > 0 ? (
          <Badge variant="destructive">{row.discrepancyCount} item</Badge>
        ) : row.status === 'completed' ? (
          <Badge variant="success">Cocok</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
    },
    {
      key: 'createdBy',
      header: 'Dibuat Oleh',
      cell: (row) => row.createdByEmployee?.name || '-',
    },
    {
      key: 'createdAt',
      header: 'Tanggal',
      cell: (row) => formatDateTime(row.createdAt),
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
            <DropdownMenuItem onClick={() => navigate(`/app/inventory/stock-opname/${row.id}`)}>
              <Eye className="mr-2 h-4 w-4" />
              Lihat Detail
            </DropdownMenuItem>
            {(row.status === 'draft' || row.status === 'in_progress') && (
              <DropdownMenuItem
                onClick={() => setCancelTarget(row)}
                className="text-destructive"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Batalkan
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Opname"
        description="Hitung fisik stok dan sesuaikan dengan sistem"
      >
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Buat Opname
        </Button>
      </PageHeader>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_progress">Berlangsung</SelectItem>
            <SelectItem value="completed">Selesai</SelectItem>
            <SelectItem value="cancelled">Dibatalkan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={opnames || []}
        isLoading={isLoading}
        emptyTitle="Belum ada stock opname"
        emptyDescription="Buat sesi stock opname baru untuk mulai menghitung stok fisik."
      />

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Buat Stock Opname Baru
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Semua produk yang dilacak stoknya di outlet akan dimasukkan ke dalam sesi opname ini.
            </p>
            <div className="space-y-2">
              <Label>Catatan (opsional)</Label>
              <Textarea
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                placeholder="Catatan untuk sesi opname ini..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                if (!user?.outletId) {
                  toast.error({ title: 'Outlet tidak ditemukan' });
                  return;
                }
                createMutation.mutate({
                  outletId: user.outletId,
                  notes: createNotes || undefined,
                });
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Buat Opname
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirm */}
      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
        title="Batalkan Stock Opname?"
        description={`Stock opname ${cancelTarget?.opnameNumber} akan dibatalkan. Tidak ada perubahan stok yang akan dilakukan.`}
        confirmLabel="Ya, Batalkan"
        variant="destructive"
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
