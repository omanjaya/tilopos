import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { waitingListApi } from '@/api/endpoints/waiting-list.api';
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
import { Card, CardContent } from '@/components/ui/card';
import { useUIStore } from '@/stores/ui.store';
import { formatDateTime } from '@/lib/format';
import { toast } from '@/lib/toast-utils';
import { Plus, MoreHorizontal, Bell, Armchair, XCircle, UserX, Clock, Users, Timer } from 'lucide-react';
import type { WaitingListEntry, WaitingListStatus } from '@/types/waiting-list.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';
import { AddCustomerDialog } from './components/add-customer-dialog';
import { SeatCustomerDialog } from './components/seat-customer-dialog';

const STATUS_MAP: Record<WaitingListStatus, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
  waiting: { label: 'Menunggu', variant: 'secondary' },
  seated: { label: 'Duduk', variant: 'default' },
  cancelled: { label: 'Dibatalkan', variant: 'outline' },
  no_show: { label: 'Tidak Datang', variant: 'destructive' },
};

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'waiting', label: 'Menunggu' },
  { value: 'seated', label: 'Duduk' },
  { value: 'cancelled', label: 'Dibatalkan' },
];

interface ActionState {
  entry: WaitingListEntry;
  action: 'notify' | 'cancel' | 'no_show';
}

export function WaitingListPage() {
  const queryClient = useQueryClient();
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const [statusFilter, setStatusFilter] = useState('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [seatDialogData, setSeatDialogData] = useState<WaitingListEntry | null>(null);
  const [confirmAction, setConfirmAction] = useState<ActionState | null>(null);

  // Fetch waiting list entries
  const { data: entries, isLoading } = useQuery({
    queryKey: ['waiting-list', selectedOutletId, statusFilter],
    queryFn: () =>
      waitingListApi.list({
        outletId: selectedOutletId || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
    refetchInterval: 30000, // Refresh every 30s
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['waiting-list-stats', selectedOutletId],
    queryFn: () => waitingListApi.stats(selectedOutletId || undefined),
    refetchInterval: 30000,
  });

  // Notify mutation
  const notifyMutation = useMutation({
    mutationFn: (id: string) => waitingListApi.notify(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiting-list'] });
      toast.success({
        title: 'Notifikasi dikirim',
        description: `Pelanggan "${confirmAction?.entry.customerName}" telah diberi notifikasi`,
      });
      setConfirmAction(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal mengirim notifikasi',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => waitingListApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiting-list'] });
      queryClient.invalidateQueries({ queryKey: ['waiting-list-stats'] });
      toast.success({
        title: 'Antrian dibatalkan',
        description: `Antrian "${confirmAction?.entry.customerName}" telah dibatalkan`,
      });
      setConfirmAction(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal membatalkan antrian',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  // No-show mutation
  const noShowMutation = useMutation({
    mutationFn: (id: string) => waitingListApi.noShow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiting-list'] });
      queryClient.invalidateQueries({ queryKey: ['waiting-list-stats'] });
      toast.success({
        title: 'Ditandai tidak datang',
        description: `Pelanggan "${confirmAction?.entry.customerName}" ditandai tidak datang`,
      });
      setConfirmAction(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error({
        title: 'Gagal menandai tidak datang',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const handleAction = () => {
    if (!confirmAction) return;

    switch (confirmAction.action) {
      case 'notify':
        notifyMutation.mutate(confirmAction.entry.id);
        break;
      case 'cancel':
        cancelMutation.mutate(confirmAction.entry.id);
        break;
      case 'no_show':
        noShowMutation.mutate(confirmAction.entry.id);
        break;
    }
  };

  const getWaitTime = (createdAt: string): string => {
    const start = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins} menit`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}j ${mins}m`;
  };

  const columns: Column<WaitingListEntry>[] = [
    {
      key: 'customerName',
      header: 'Pelanggan',
      cell: (row) => (
        <div>
          <span className="font-medium">{row.customerName}</span>
          <p className="text-xs text-muted-foreground">{row.phoneNumber}</p>
        </div>
      ),
    },
    {
      key: 'partySize',
      header: 'Jumlah',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{row.partySize} orang</span>
        </div>
      ),
    },
    {
      key: 'waitTime',
      header: 'Waktu Tunggu',
      cell: (row) => {
        if (row.status !== 'waiting') return '-';
        return (
          <div className="flex items-center gap-1.5">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span>{getWaitTime(row.createdAt)}</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const status = STATUS_MAP[row.status];
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
    {
      key: 'tableName',
      header: 'Meja',
      cell: (row) => (
        <span className="text-muted-foreground">{row.tableName || '-'}</span>
      ),
    },
    {
      key: 'specialRequests',
      header: 'Catatan',
      cell: (row) => (
        <span className="text-muted-foreground text-sm">{row.specialRequests || '-'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Waktu Daftar',
      cell: (row) => (
        <span className="text-muted-foreground text-sm">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => {
        if (row.status !== 'waiting') return null;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Aksi antrian">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setConfirmAction({ entry: row, action: 'notify' })}>
                <Bell className="mr-2 h-4 w-4" /> Kirim Notifikasi
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSeatDialogData(row)}>
                <Armchair className="mr-2 h-4 w-4" /> Dudukkan
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConfirmAction({ entry: row, action: 'cancel' })}
                className="text-orange-600"
              >
                <XCircle className="mr-2 h-4 w-4" /> Batalkan
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConfirmAction({ entry: row, action: 'no_show' })}
                className="text-destructive"
              >
                <UserX className="mr-2 h-4 w-4" /> Tidak Datang
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setAddDialogOpen(true);
      }

      // Number keys 1-4 for tab switching
      const tabMap: Record<string, string> = {
        '1': 'all',
        '2': 'waiting',
        '3': 'seated',
        '4': 'cancelled',
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
      <PageHeader title="Daftar Tunggu" description="Kelola antrian pelanggan">
        <HelpSidebar page="waiting-list" />
        <Button onClick={() => setAddDialogOpen(true)} aria-keyshortcuts="N">
          <Plus className="mr-2 h-4 w-4" /> Tambah Pelanggan
        </Button>
      </PageHeader>

      <InlineHelpCard page="waiting-list" className="mb-4" />

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Menunggu</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalWaiting}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rata-rata Tunggu</p>
                  <p className="text-3xl font-bold mt-1">{stats.averageWaitTime} min</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Timer className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tunggu Terlama</p>
                  <p className="text-3xl font-bold mt-1">{stats.longestWaitTime} min</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Tabs */}
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

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={entries ?? []}
        isLoading={isLoading}
        searchPlaceholder="Cari pelanggan..."
        emptyTitle="Belum ada antrian"
        emptyDescription="Pelanggan yang menunggu akan muncul di sini. Klik tombol 'Tambah Pelanggan' untuk memulai."
        emptyAction={
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Pelanggan Pertama
          </Button>
        }
      />

      {/* Add Customer Dialog */}
      <AddCustomerDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['waiting-list'] });
          queryClient.invalidateQueries({ queryKey: ['waiting-list-stats'] });
          setAddDialogOpen(false);
        }}
      />

      {/* Seat Customer Dialog */}
      {seatDialogData && (
        <SeatCustomerDialog
          open={!!seatDialogData}
          entry={seatDialogData}
          onOpenChange={(open) => !open && setSeatDialogData(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['waiting-list'] });
            queryClient.invalidateQueries({ queryKey: ['waiting-list-stats'] });
            setSeatDialogData(null);
          }}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={
          confirmAction?.action === 'notify'
            ? 'Kirim Notifikasi'
            : confirmAction?.action === 'cancel'
            ? 'Batalkan Antrian'
            : 'Tandai Tidak Datang'
        }
        description={
          confirmAction?.action === 'notify'
            ? `Kirim notifikasi ke "${confirmAction?.entry.customerName}" bahwa mejanya sudah siap?`
            : confirmAction?.action === 'cancel'
            ? `Apakah Anda yakin ingin membatalkan antrian "${confirmAction?.entry.customerName}"?`
            : `Tandai "${confirmAction?.entry.customerName}" sebagai tidak datang? Tindakan ini tidak dapat dibatalkan.`
        }
        confirmLabel={
          confirmAction?.action === 'notify'
            ? 'Kirim'
            : confirmAction?.action === 'cancel'
            ? 'Batalkan'
            : 'Tandai'
        }
        variant={confirmAction?.action === 'no_show' ? 'destructive' : 'default'}
        onConfirm={handleAction}
        isLoading={notifyMutation.isPending || cancelMutation.isPending || noShowMutation.isPending}
      />
    </div>
  );
}
