import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api/endpoints/settings.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/format';
import { CheckCheck, Search } from 'lucide-react';
import type { NotificationSetting, NotificationLog } from '@/types/settings.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  low_stock: 'Stok Rendah',
  new_order: 'Pesanan Baru',
  order_completed: 'Pesanan Selesai',
  payment_received: 'Pembayaran Diterima',
  shift_started: 'Shift Dimulai',
  shift_ended: 'Shift Berakhir',
  refund_requested: 'Permintaan Refund',
  stock_transfer: 'Transfer Stok',
};

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  push: 'Push Notification',
  sms: 'SMS',
  in_app: 'Dalam Aplikasi',
};

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [recipientId, setRecipientId] = useState('');
  const [searchRecipient, setSearchRecipient] = useState('');

  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: settingsApi.listNotificationSettings,
  });

  const { data: logs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['notification-logs', searchRecipient],
    queryFn: () => settingsApi.getNotificationLogs(searchRecipient),
    enabled: !!searchRecipient,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      settingsApi.updateNotificationSetting(id, { isEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast({ title: 'Pengaturan notifikasi diperbarui' });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal memperbarui pengaturan',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => settingsApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
      toast({ title: 'Notifikasi ditandai sudah dibaca' });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal memperbarui notifikasi',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const handleSearchLogs = (e: React.FormEvent) => {
    e.preventDefault();
    if (recipientId.trim()) {
      setSearchRecipient(recipientId.trim());
    }
  };

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
            ) : settings && (settings ?? []).length > 0 ? (
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
                      disabled={toggleMutation.isPending}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Belum ada pengaturan notifikasi.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Notification Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Log Notifikasi</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearchLogs} className="mb-4 flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="recipient-id">ID Penerima</Label>
                <Input
                  id="recipient-id"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  placeholder="Masukkan ID penerima untuk melihat log"
                />
              </div>
              <Button type="submit" variant="secondary" disabled={!recipientId.trim()}>
                <Search className="mr-2 h-4 w-4" /> Cari
              </Button>
            </form>

            {searchRecipient ? (
              <DataTable
                columns={logColumns}
                data={logs ?? []}
                isLoading={isLoadingLogs}
                emptyTitle="Tidak ada log notifikasi"
                emptyDescription="Tidak ditemukan log notifikasi untuk penerima ini."
              />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Masukkan ID penerima untuk melihat log notifikasi.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
