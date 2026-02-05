import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftsApi } from '@/api/endpoints/shifts.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { MetricCard } from '@/components/shared/metric-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { formatCurrency, formatDateTime } from '@/lib/format';
import {
  Play,
  Square,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  Wallet,
  Receipt,
  Hash,
  Loader2,
} from 'lucide-react';
import type { Shift } from '@/types/order.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

function formatDuration(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}j ${minutes}m`;
}

export function ShiftsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);

  const [startShiftOpen, setStartShiftOpen] = useState(false);
  const [openingCash, setOpeningCash] = useState('');
  const [endShiftOpen, setEndShiftOpen] = useState(false);
  const [closingCash, setClosingCash] = useState('');
  const [endShiftNotes, setEndShiftNotes] = useState('');
  const [cashInOpen, setCashInOpen] = useState(false);
  const [cashInAmount, setCashInAmount] = useState('');
  const [cashInNotes, setCashInNotes] = useState('');
  const [cashOutOpen, setCashOutOpen] = useState(false);
  const [cashOutAmount, setCashOutAmount] = useState('');
  const [cashOutNotes, setCashOutNotes] = useState('');

  const employeeId = user?.employeeId || '';

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shifts', employeeId],
    queryFn: () => shiftsApi.list(employeeId),
    enabled: !!employeeId,
  });

  const activeShift = shifts?.find((s) => !s.endedAt) ?? null;

  const startShiftMutation = useMutation({
    mutationFn: (data: { outletId: string; openingCash: number }) =>
      shiftsApi.start(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast({ title: 'Shift berhasil dimulai' });
      setStartShiftOpen(false);
      setOpeningCash('');
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal memulai shift',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const endShiftMutation = useMutation({
    mutationFn: (data: { closingCash: number; notes?: string }) =>
      shiftsApi.end(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast({ title: 'Shift berhasil ditutup' });
      setEndShiftOpen(false);
      setClosingCash('');
      setEndShiftNotes('');
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal menutup shift',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const cashInMutation = useMutation({
    mutationFn: (data: { shiftId: string; amount: number; notes?: string }) =>
      shiftsApi.cashIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast({ title: 'Cash in berhasil dicatat' });
      setCashInOpen(false);
      setCashInAmount('');
      setCashInNotes('');
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal mencatat cash in',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const cashOutMutation = useMutation({
    mutationFn: (data: { shiftId: string; amount: number; notes?: string }) =>
      shiftsApi.cashOut(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast({ title: 'Cash out berhasil dicatat' });
      setCashOutOpen(false);
      setCashOutAmount('');
      setCashOutNotes('');
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal mencatat cash out',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const historyShifts = shifts?.filter((s) => !!s.endedAt) ?? [];

  const columns: Column<Shift>[] = [
    {
      key: 'startedAt',
      header: 'Tanggal',
      cell: (row) => (
        <span className="text-muted-foreground">{formatDateTime(row.startedAt)}</span>
      ),
    },
    {
      key: 'outletName',
      header: 'Outlet',
      cell: (row) => row.outletName ?? '-',
    },
    {
      key: 'openingCash',
      header: 'Kas Awal',
      cell: (row) => formatCurrency(row.openingCash ?? 0),
    },
    {
      key: 'closingCash',
      header: 'Kas Akhir',
      cell: (row) => (
        <span>{row.closingCash !== null ? formatCurrency(row.closingCash) : '-'}</span>
      ),
    },
    {
      key: 'cashDifference',
      header: 'Selisih',
      cell: (row) => {
        if (row.cashDifference === null) return <span>-</span>;
        const isNegative = row.cashDifference < 0;
        return (
          <span className={isNegative ? 'text-destructive font-medium' : 'text-muted-foreground'}>
            {formatCurrency(row.cashDifference)}
          </span>
        );
      },
    },
    {
      key: 'totalSales',
      header: 'Total Penjualan',
      cell: (row) => <span className="font-medium">{formatCurrency(row.totalSales ?? 0)}</span>,
    },
    {
      key: 'totalTransactions',
      header: 'Transaksi',
      cell: (row) => row.totalTransactions ?? 0,
    },
    {
      key: 'duration',
      header: 'Durasi',
      cell: (row) => (
        <span className="text-muted-foreground">
          {formatDuration(row.startedAt, row.endedAt)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Manajemen Shift" description="Kelola shift karyawan">
        {!activeShift && (
          <Button onClick={() => setStartShiftOpen(true)}>
            <Play className="mr-2 h-4 w-4" /> Mulai Shift
          </Button>
        )}
      </PageHeader>

      {/* Active Shift */}
      {activeShift && (
        <div className="mb-8 space-y-4">
          <h2 className="text-lg font-semibold">Shift Aktif</h2>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Shift Berjalan
                </CardTitle>
                <Badge variant="default">Aktif</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <MetricCard
                  title="Kas Awal"
                  value={formatCurrency(activeShift.openingCash ?? 0)}
                  icon={Wallet}
                />
                <MetricCard
                  title="Total Penjualan"
                  value={formatCurrency(activeShift.totalSales ?? 0)}
                  icon={Receipt}
                />
                <MetricCard
                  title="Transaksi"
                  value={String(activeShift.totalTransactions ?? 0)}
                  icon={Hash}
                />
                <MetricCard
                  title="Durasi"
                  value={formatDuration(activeShift.startedAt, null)}
                  icon={Clock}
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Outlet: {activeShift.outletName ?? '-'}</span>
                <span>|</span>
                <span>Mulai: {formatDateTime(activeShift.startedAt)}</span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCashInOpen(true)}
                >
                  <ArrowDownCircle className="mr-2 h-4 w-4" /> Cash In
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCashOutOpen(true)}
                >
                  <ArrowUpCircle className="mr-2 h-4 w-4" /> Cash Out
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setEndShiftOpen(true)}
                >
                  <Square className="mr-2 h-4 w-4" /> Tutup Shift
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Shift History */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Riwayat Shift</h2>
        <DataTable
          columns={columns}
          data={historyShifts}
          isLoading={isLoading}
          emptyTitle="Belum ada riwayat shift"
          emptyDescription="Riwayat shift akan muncul di sini setelah Anda menutup shift."
        />
      </div>

      {/* Start Shift Dialog */}
      <Dialog open={startShiftOpen} onOpenChange={(open) => { if (!open) { setStartShiftOpen(false); setOpeningCash(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mulai Shift Baru</DialogTitle>
            <DialogDescription>
              Masukkan jumlah kas awal untuk memulai shift.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="opening-cash">Kas Awal (Rp)</Label>
              <Input
                id="opening-cash"
                type="number"
                placeholder="0"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setStartShiftOpen(false); setOpeningCash(''); }}
              disabled={startShiftMutation.isPending}
            >
              Batal
            </Button>
            <Button
              onClick={() => {
                if (!selectedOutletId) {
                  toast({
                    variant: 'destructive',
                    title: 'Pilih outlet terlebih dahulu',
                  });
                  return;
                }
                startShiftMutation.mutate({
                  outletId: selectedOutletId,
                  openingCash: Number(openingCash) || 0,
                });
              }}
              disabled={startShiftMutation.isPending}
              aria-busy={startShiftMutation.isPending}
              aria-label={startShiftMutation.isPending ? 'Memulai shift...' : undefined}
            >
              {startShiftMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mulai Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Shift Dialog */}
      <Dialog open={endShiftOpen} onOpenChange={(open) => { if (!open) { setEndShiftOpen(false); setClosingCash(''); setEndShiftNotes(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tutup Shift</DialogTitle>
            <DialogDescription>
              Masukkan jumlah kas akhir dan catatan untuk menutup shift.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="closing-cash">Kas Akhir (Rp)</Label>
              <Input
                id="closing-cash"
                type="number"
                placeholder="0"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-shift-notes">Catatan (opsional)</Label>
              <Textarea
                id="end-shift-notes"
                placeholder="Masukkan catatan shift..."
                value={endShiftNotes}
                onChange={(e) => setEndShiftNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setEndShiftOpen(false); setClosingCash(''); setEndShiftNotes(''); }}
              disabled={endShiftMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                endShiftMutation.mutate({
                  closingCash: Number(closingCash) || 0,
                  notes: endShiftNotes || undefined,
                });
              }}
              disabled={endShiftMutation.isPending}
              aria-busy={endShiftMutation.isPending}
              aria-label={endShiftMutation.isPending ? 'Menutup shift...' : undefined}
            >
              {endShiftMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tutup Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cash In Dialog */}
      <Dialog open={cashInOpen} onOpenChange={(open) => { if (!open) { setCashInOpen(false); setCashInAmount(''); setCashInNotes(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cash In</DialogTitle>
            <DialogDescription>
              Catat pemasukan kas ke dalam laci.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cash-in-amount">Jumlah (Rp)</Label>
              <Input
                id="cash-in-amount"
                type="number"
                placeholder="0"
                value={cashInAmount}
                onChange={(e) => setCashInAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cash-in-notes">Catatan (opsional)</Label>
              <Textarea
                id="cash-in-notes"
                placeholder="Masukkan catatan..."
                value={cashInNotes}
                onChange={(e) => setCashInNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setCashInOpen(false); setCashInAmount(''); setCashInNotes(''); }}
              disabled={cashInMutation.isPending}
            >
              Batal
            </Button>
            <Button
              onClick={() => {
                if (!activeShift) return;
                cashInMutation.mutate({
                  shiftId: activeShift.id,
                  amount: Number(cashInAmount) || 0,
                  notes: cashInNotes || undefined,
                });
              }}
              disabled={cashInMutation.isPending || !cashInAmount || Number(cashInAmount) <= 0}
              aria-busy={cashInMutation.isPending}
              aria-label={cashInMutation.isPending ? 'Menyimpan cash in...' : undefined}
            >
              {cashInMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cash Out Dialog */}
      <Dialog open={cashOutOpen} onOpenChange={(open) => { if (!open) { setCashOutOpen(false); setCashOutAmount(''); setCashOutNotes(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cash Out</DialogTitle>
            <DialogDescription>
              Catat pengeluaran kas dari laci.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cash-out-amount">Jumlah (Rp)</Label>
              <Input
                id="cash-out-amount"
                type="number"
                placeholder="0"
                value={cashOutAmount}
                onChange={(e) => setCashOutAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cash-out-notes">Catatan (opsional)</Label>
              <Textarea
                id="cash-out-notes"
                placeholder="Masukkan catatan..."
                value={cashOutNotes}
                onChange={(e) => setCashOutNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setCashOutOpen(false); setCashOutAmount(''); setCashOutNotes(''); }}
              disabled={cashOutMutation.isPending}
            >
              Batal
            </Button>
            <Button
              onClick={() => {
                if (!activeShift) return;
                cashOutMutation.mutate({
                  shiftId: activeShift.id,
                  amount: Number(cashOutAmount) || 0,
                  notes: cashOutNotes || undefined,
                });
              }}
              disabled={cashOutMutation.isPending || !cashOutAmount || Number(cashOutAmount) <= 0}
              aria-busy={cashOutMutation.isPending}
              aria-label={cashOutMutation.isPending ? 'Menyimpan cash out...' : undefined}
            >
              {cashOutMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
