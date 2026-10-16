import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api/endpoints/settings.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ErrorState } from '@/components/shared/error-state';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
import { formatDateTime } from '@/lib/format';
import { useCan } from '@/features/auth/use-permission';
import { CheckCheck, Plus } from 'lucide-react';
import type { NotificationSetting, NotificationLog } from '@/types/settings.types';

// Keys match notifications.controller.ts (notificationType / channel enums)
const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  low_stock: 'Stok Rendah',
  large_transaction: 'Transaksi Besar',
  refund: 'Refund',
  online_order: 'Pesanan Online',
  shift_reminder: 'Pengingat Shift',
  system_error: 'Gangguan Sistem',
};

const CHANNEL_LABELS: Record<string, string> = {
  push: 'Notifikasi Push',
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
};

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const [newType, setNewType] = useState('low_stock');
  const [newChannel, setNewChannel] = useState('push');
  // POST/PUT /notifications/settings are owner/manager only; other roles only see their own settings
  const canManage = useCan('notifications.manage');

  const {
    data: settings,
    isLoading: isLoadingSettings,
    isError: isSettingsError,
    error: settingsError,
    refetch: refetchSettings,
  } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: settingsApi.listNotificationSettings,
  });

  // GET /notifications/logs returns the current user's own notifications
  const {
    data: logs,
    isLoading: isLoadingLogs,
    error: logsError,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ['notification-logs'],
    queryFn: () => settingsApi.getNotificationLogs(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      settingsApi.createNotificationSetting({ type: newType, channel: newChannel, isEnabled: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast.success({ title: 'Pengaturan notifikasi ditambahkan' });
    },
    onError: (err) => handleMutationError(err, 'Gagal menambahkan pengaturan'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      settingsApi.updateNotificationSetting(id, { isEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast.success({ title: 'Pengaturan notifikasi diperbarui' });
    },
    onError: (error) => handleMutationError(error, 'Gagal memperbarui pengaturan'),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => settingsApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
      toast.success({ title: 'Notifikasi ditandai sudah dibaca' });
    },
    onError: (error) => handleMutationError(error, 'Gagal memperbarui notifikasi'),
  });

  const logColumns: Column<NotificationLog>[] = [
    {
      key: 'type',
      header: 'Tipe',
      cell: (row) => (
        <Badge variant="secondary">
          {NOTIFICATION_TYPE_LABELS[row.type] ?? row.type}
        </Badge>
      ),
    },
    {
      key: 'message',
      header: 'Pesan',
      cell: (row) => <span className="text-sm">{row.message}</span>,
    },
    {
      key: 'isRead',
      header: 'Status',
      cell: (row) =>
        row.isRead ? (
          <Badge variant="outline">Dibaca</Badge>
        ) : (
          <Badge variant="default">Belum Dibaca</Badge>
        ),
    },
    {
      key: 'createdAt',
      header: 'Tanggal',
      cell: (row) => (
        <span className="text-muted-foreground">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) =>
        !row.isRead ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markReadMutation.mutate(row.id)}
            disabled={markReadMutation.isPending}
          >
            <CheckCheck className="mr-2 h-4 w-4" /> Tandai Dibaca
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader title="Notifikasi" description="Atur preferensi notifikasi" />

      <div className="space-y-6">
        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pengaturan Notifikasi</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSettings ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-6 w-11" />
                  </div>
                ))}
              </div>
            ) : isSettingsError ? (
              <ErrorState
                title="Gagal memuat pengaturan notifikasi"
                error={settingsError}
                onRetry={() => void refetchSettings()}
              />
            ) : settings && settings.length > 0 ? (
              <div className="space-y-4">
                {settings.map((setting: NotificationSetting) => (
                  <div
                    key={setting.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {NOTIFICATION_TYPE_LABELS[setting.type] ?? setting.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {CHANNEL_LABELS[setting.channel] ?? setting.channel}
                      </p>
                    </div>
                    <Switch
                      checked={setting.isEnabled}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: setting.id, isEnabled: checked })
                      }
                      disabled={!canManage || toggleMutation.isPending}
                      aria-label={`${NOTIFICATION_TYPE_LABELS[setting.type] ?? setting.type} via ${CHANNEL_LABELS[setting.channel] ?? setting.channel}`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Belum ada pengaturan notifikasi.
              </p>
            )}
            {!isSettingsError && canManage && (
              <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border p-4">
                <div className="min-w-40 flex-1 space-y-1">
                  <span className="text-xs text-muted-foreground">Jenis</span>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger aria-label="Jenis notifikasi">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(NOTIFICATION_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-40 flex-1 space-y-1">
                  <span className="text-xs text-muted-foreground">Saluran</span>
                  <Select value={newChannel} onValueChange={setNewChannel}>
                    <SelectTrigger aria-label="Saluran notifikasi">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                >
                  <Plus className="mr-2 h-4 w-4" /> Tambah
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notifikasi Saya</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={logColumns}
              data={logs ?? []}
              isLoading={isLoadingLogs}
              error={logsError}
              onRetry={() => void refetchLogs()}
              emptyTitle="Tidak ada log notifikasi"
              emptyDescription="Belum ada notifikasi untuk akun Anda."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
