import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { waitingListApi } from '@/api/endpoints/waiting-list.api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { MobileNavSpacer } from '@/components/shared/mobile-nav';
import { useToast } from '@/hooks/use-toast';
import { useUIStore } from '@/stores/ui.store';
import { formatDateTime } from '@/lib/format';
import {
  Search,
  Plus,
  Bell,
  Armchair,
  XCircle,
  UserX,
  Clock,
  Users,
  Timer,
  Phone,
} from 'lucide-react';
import type { WaitingListEntry, WaitingListStatus } from '@/types/waiting-list.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';
import { AddCustomerDialog } from './components/add-customer-dialog';
import { SeatCustomerDialog } from './components/seat-customer-dialog';

/**
 * WaitingListPage Mobile Version
 *
 * Mobile-optimized waiting list with:
 * - Swipeable stats cards
 * - Status tabs
 * - Queue cards with swipe actions
 * - Bottom sheet for actions
 * - FAB for add customer
 */

const STATUS_MAP: Record<WaitingListStatus, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary'; color: string }> = {
  waiting: { label: 'Menunggu', variant: 'secondary', color: 'text-blue-600' },
  seated: { label: 'Duduk', variant: 'default', color: 'text-green-600' },
  cancelled: { label: 'Dibatalkan', variant: 'outline', color: 'text-orange-600' },
  no_show: { label: 'Tidak Datang', variant: 'destructive', color: 'text-destructive' },
};

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'waiting', label: 'Menunggu' },
  { value: 'seated', label: 'Duduk' },
];

interface ActionState {
  entry: WaitingListEntry;
  action: 'notify' | 'cancel' | 'no_show';
}

export function WaitingListPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WaitingListEntry | null>(null);
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
    refetchInterval: 30000,
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
      toast({ title: 'Notifikasi berhasil dikirim' });
      setConfirmAction(null);
      setSelectedEntry(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
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
      toast({ title: 'Antrian berhasil dibatalkan' });
      setConfirmAction(null);
      setSelectedEntry(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
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
      toast({ title: 'Ditandai tidak datang' });
      setConfirmAction(null);
      setSelectedEntry(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
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

  // Filter by search
  const filteredEntries = (entries || []).filter((entry) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      entry.customerName.toLowerCase().includes(searchLower) ||
      entry.phoneNumber.toLowerCase().includes(searchLower)
    );
  });

  // Real-time wait time update
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update wait times
      queryClient.invalidateQueries({ queryKey: ['waiting-list'] });
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [queryClient]);

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold">Daftar Tunggu</h1>
              <p className="text-sm text-muted-foreground">
                {filteredEntries.length} antrian
              </p>
            </div>
          </div>

          {/* Stats Cards - Horizontal Scroll */}
          {stats && (
            <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide mb-3">
              <Card className="flex-shrink-0 w-[140px]">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stats.totalWaiting}</p>
                  <p className="text-xs text-muted-foreground">Menunggu</p>
                </CardContent>
              </Card>

              <Card className="flex-shrink-0 w-[140px]">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Timer className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stats.averageWaitTime}</p>
                  <p className="text-xs text-muted-foreground">Rata-rata (min)</p>
                </CardContent>
              </Card>

              <Card className="flex-shrink-0 w-[140px]">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-orange-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stats.longestWaitTime}</p>
                  <p className="text-xs text-muted-foreground">Terlama (min)</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari pelanggan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          {/* Status Tabs */}
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-auto">
              {STATUS_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="text-xs py-2"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted/50 p-6 mb-4">
              <Clock className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">Belum ada antrian</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Pelanggan yang menunggu akan muncul di sini
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Tambah Pelanggan
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <QueueCard
                key={entry.id}
                entry={entry}
                getWaitTime={getWaitTime}
                onClick={() => setSelectedEntry(entry)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setAddDialogOpen(true)}
        className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform flex items-center justify-center"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Mobile Nav Spacer */}
      <MobileNavSpacer />

      {/* Entry Detail Sheet */}
      <Sheet open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <SheetContent side="bottom" className="h-[85vh]">
          {selectedEntry && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedEntry.customerName}</SheetTitle>
                <SheetDescription>
                  {formatDateTime(selectedEntry.createdAt)}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                {/* Entry Info */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={STATUS_MAP[selectedEntry.status].variant}>
                      {STATUS_MAP[selectedEntry.status].label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Telepon</span>
                    <a href={`tel:${selectedEntry.phoneNumber}`} className="text-sm font-medium text-primary">
                      {selectedEntry.phoneNumber}
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Jumlah</span>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span className="text-sm font-medium">{selectedEntry.partySize} orang</span>
                    </div>
                  </div>
                  {selectedEntry.status === 'waiting' && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Waktu Tunggu</span>
                      <div className="flex items-center gap-1.5">
                        <Timer className="h-4 w-4" />
                        <span className="text-sm font-medium">{getWaitTime(selectedEntry.createdAt)}</span>
                      </div>
                    </div>
                  )}
                  {selectedEntry.tableName && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Meja</span>
                      <span className="text-sm font-medium">{selectedEntry.tableName}</span>
                    </div>
                  )}
                  {selectedEntry.specialRequests && (
                    <div>
                      <span className="text-sm text-muted-foreground">Catatan Khusus</span>
                      <p className="text-sm mt-1">{selectedEntry.specialRequests}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {selectedEntry.status === 'waiting' && (
                  <div className="space-y-2 pt-4">
                    <Button
                      variant="default"
                      className="w-full justify-start h-12"
                      onClick={() => {
                        setSeatDialogData(selectedEntry);
                        setSelectedEntry(null);
                      }}
                    >
                      <Armchair className="mr-3 h-5 w-5" />
                      Dudukkan
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start h-12"
                      onClick={() => setConfirmAction({ entry: selectedEntry, action: 'notify' })}
                    >
                      <Bell className="mr-3 h-5 w-5" />
                      Kirim Notifikasi
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start h-12"
                      onClick={() => window.open(`tel:${selectedEntry.phoneNumber}`)}
                    >
                      <Phone className="mr-3 h-5 w-5" />
                      Telepon
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start h-12 text-orange-600 hover:text-orange-600"
                      onClick={() => setConfirmAction({ entry: selectedEntry, action: 'cancel' })}
                    >
                      <XCircle className="mr-3 h-5 w-5" />
                      Batalkan
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start h-12 text-destructive hover:text-destructive"
                      onClick={() => setConfirmAction({ entry: selectedEntry, action: 'no_show' })}
                    >
                      <UserX className="mr-3 h-5 w-5" />
                      Tidak Datang
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

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
            ? `Kirim notifikasi ke "${confirmAction?.entry.customerName}"?`
            : confirmAction?.action === 'cancel'
            ? `Batalkan antrian "${confirmAction?.entry.customerName}"?`
            : `Tandai "${confirmAction?.entry.customerName}" sebagai tidak datang?`
        }
        confirmLabel={
          confirmAction?.action === 'notify'
            ? 'Kirim'
            : confirmAction?.action === 'cancel'
            ? 'Batalkan'
            : 'Tandai'
        }
        onConfirm={handleAction}
        isLoading={notifyMutation.isPending || cancelMutation.isPending || noShowMutation.isPending}
      />
    </div>
  );
}

/**
 * QueueCard Component
 * Individual queue entry card
 */
interface QueueCardProps {
  entry: WaitingListEntry;
  getWaitTime: (createdAt: string) => string;
  onClick: () => void;
}

function QueueCard({ entry, getWaitTime, onClick }: QueueCardProps) {
  const status = STATUS_MAP[entry.status];

  return (
    <Card className="overflow-hidden cursor-pointer active:scale-[0.98] transition-transform" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base">{entry.customerName}</h3>
              <Badge variant={status.variant} className="text-xs">
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{entry.phoneNumber}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{entry.partySize} orang</span>
            {entry.status === 'waiting' && (
              <>
                <span className="text-muted-foreground">•</span>
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-orange-600">{getWaitTime(entry.createdAt)}</span>
              </>
            )}
          </div>
          {entry.tableName && (
            <div className="flex items-center gap-2 text-sm">
              <Armchair className="h-4 w-4 text-muted-foreground" />
              <span>Meja {entry.tableName}</span>
            </div>
          )}
          {entry.specialRequests && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {entry.specialRequests}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
