import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api/endpoints/settings.api';
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
import { useToast } from '@/hooks/use-toast';
import { useRealtimeDeviceSync } from '@/hooks/use-realtime';
import { formatDateTime } from '@/lib/format';
import { MoreHorizontal, RefreshCw, Trash2 } from 'lucide-react';
import { DeviceStatusIndicator, type DeviceSyncStatus } from './components/device-status-indicator';
import type { Device } from '@/types/settings.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

const DEVICE_TYPE_LABELS: Record<string, string> = {
  pos_terminal: 'POS Terminal',
  kds_display: 'KDS Display',
  mobile: 'Mobile',
  desktop: 'Desktop',
  tablet: 'Tablet',
};

const DEVICE_TYPE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  pos_terminal: 'default',
  kds_display: 'secondary',
  mobile: 'outline',
  desktop: 'secondary',
  tablet: 'outline',
};

function resolveDeviceSyncStatus(
  device: Device,
  realtimeStatuses: Map<string, { status: string; lastSyncTime: string | null }>,
): { syncStatus: DeviceSyncStatus; lastSyncTime: string | null } {
  const realtime = realtimeStatuses.get(device.id);
  if (realtime) {
    const status = realtime.status;
    if (status === 'syncing') return { syncStatus: 'syncing', lastSyncTime: realtime.lastSyncTime };
    if (status === 'synced') return { syncStatus: 'online', lastSyncTime: realtime.lastSyncTime };
    if (status === 'offline' || status === 'failed') return { syncStatus: 'offline', lastSyncTime: realtime.lastSyncTime };
  }
  // Fallback to device data
  if (!device.isActive) return { syncStatus: 'offline', lastSyncTime: device.lastSyncAt };
  return { syncStatus: 'online', lastSyncTime: device.lastSyncAt };
}

export function DevicesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<Device | null>(null);

  const { deviceStatuses } = useRealtimeDeviceSync();

  const { data: devices, isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: settingsApi.listDevices,
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => settingsApi.syncDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast({ title: 'Sinkronisasi perangkat berhasil' });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal sinkronisasi',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsApi.removeDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast({ title: 'Perangkat berhasil dihapus' });
      setDeleteTarget(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal menghapus perangkat',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const columns: Column<Device>[] = [
    {
      key: 'deviceName',
      header: 'Nama',
      cell: (row) => <span className="font-medium">{row.deviceName}</span>,
    },
    {
      key: 'deviceType',
      header: 'Tipe',
      cell: (row) => (
        <Badge variant={DEVICE_TYPE_VARIANTS[row.deviceType] ?? 'outline'}>
          {DEVICE_TYPE_LABELS[row.deviceType] ?? row.deviceType}
        </Badge>
      ),
    },
    {
      key: 'platform',
      header: 'Platform',
      cell: (row) => (
        <span className="text-muted-foreground">{row.platform ?? '-'}</span>
      ),
    },
    {
      key: 'outletId',
      header: 'Outlet',
      cell: (row) => (
        <span className="text-muted-foreground">{row.outletId ?? '-'}</span>
      ),
    },
    {
      key: 'lastSyncAt',
      header: 'Terakhir Sync',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.lastSyncAt ? formatDateTime(row.lastSyncAt) : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const { syncStatus, lastSyncTime } = resolveDeviceSyncStatus(row, deviceStatuses);
        return <DeviceStatusIndicator status={syncStatus} lastSyncTime={lastSyncTime} />;
      },
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Aksi perangkat">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => syncMutation.mutate(row.id)}
              disabled={syncMutation.isPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Sync
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
      <PageHeader title="Perangkat" description="Kelola perangkat terdaftar" />

      <DataTable
        columns={columns}
        data={devices ?? []}
        isLoading={isLoading}
        emptyTitle="Belum ada perangkat"
        emptyDescription="Belum ada perangkat yang terdaftar."
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Perangkat"
        description={`Apakah Anda yakin ingin menghapus perangkat "${deleteTarget?.deviceName}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
