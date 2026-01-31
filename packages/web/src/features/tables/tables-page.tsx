import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { tablesApi } from '@/api/endpoints/tables.api';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Scissors, Merge, Loader2, Info, LayoutGrid, List } from 'lucide-react';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';
import { TableLayoutEditor, generateDemoTables } from './components/table-layout-editor';

export function TablesPage() {
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<'list' | 'layout'>('list');

  const [splitOpen, setSplitOpen] = useState(false);
  const [splitTransactionId, setSplitTransactionId] = useState('');
  const [splitCount, setSplitCount] = useState('2');

  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeTransactionIds, setMergeTransactionIds] = useState('');

  // Demo tables for the layout editor (replace with API data when available)
  const [demoTables] = useState(() => generateDemoTables());

  const splitBillMutation = useMutation({
    mutationFn: (data: { transactionId: string; numberOfSplits: number }) =>
      tablesApi.splitBill(data),
    onSuccess: () => {
      toast({ title: 'Bill berhasil di-split' });
      setSplitOpen(false);
      setSplitTransactionId('');
      setSplitCount('2');
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal split bill',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const mergeBillMutation = useMutation({
    mutationFn: (data: { transactionIds: string[] }) =>
      tablesApi.mergeBill(data),
    onSuccess: () => {
      toast({ title: 'Bill berhasil di-merge' });
      setMergeOpen(false);
      setMergeTransactionIds('');
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal merge bill',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Manajemen Meja" description="Kelola meja restoran Anda" />

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 border rounded-lg p-1 shrink-0">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-1.5"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Daftar</span>
          </Button>
          <Button
            variant={viewMode === 'layout' ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-1.5"
            onClick={() => setViewMode('layout')}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Denah</span>
          </Button>
        </div>
      </div>

      {/* Layout View */}
      {viewMode === 'layout' && (
        <div className="mb-6">
          <TableLayoutEditor
            tables={demoTables}
            editable
            onSavePositions={(positions) => {
              toast({
                title: 'Posisi meja disimpan',
                description: `${positions.length} meja berhasil diperbarui`,
              });
            }}
          />
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {/* Info Notice */}
          <Card className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
            <CardContent className="flex items-start gap-3 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium">Fitur CRUD meja belum tersedia</p>
                <p className="mt-1 text-blue-600 dark:text-blue-400">
                  Saat ini Anda dapat menggunakan fitur Split Bill dan Merge Bill untuk mengelola tagihan meja.
                  Fitur manajemen meja lengkap akan segera hadir.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Split Bill Card */}
        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setSplitOpen(true)}>
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Scissors className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="mt-3">Split Bill</CardTitle>
            <CardDescription>
              Bagi satu tagihan menjadi beberapa bagian untuk memudahkan pembayaran terpisah.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={(e) => { e.stopPropagation(); setSplitOpen(true); }}>
              Split Bill
            </Button>
          </CardContent>
        </Card>

        {/* Merge Bill Card */}
        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setMergeOpen(true)}>
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Merge className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="mt-3">Merge Bill</CardTitle>
            <CardDescription>
              Gabungkan beberapa tagihan menjadi satu tagihan untuk pembayaran sekaligus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={(e) => { e.stopPropagation(); setMergeOpen(true); }}>
              Merge Bill
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Split Bill Dialog */}
      <Dialog open={splitOpen} onOpenChange={(open) => { if (!open) { setSplitOpen(false); setSplitTransactionId(''); setSplitCount('2'); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Split Bill</DialogTitle>
            <DialogDescription>
              Bagi tagihan menjadi beberapa bagian pembayaran.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="split-transaction-id">ID Transaksi</Label>
              <Input
                id="split-transaction-id"
                placeholder="Masukkan ID transaksi..."
                value={splitTransactionId}
                onChange={(e) => setSplitTransactionId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="split-count">Jumlah Bagian</Label>
              <Input
                id="split-count"
                type="number"
                min="2"
                max="10"
                placeholder="2"
                value={splitCount}
                onChange={(e) => setSplitCount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setSplitOpen(false); setSplitTransactionId(''); setSplitCount('2'); }}
              disabled={splitBillMutation.isPending}
            >
              Batal
            </Button>
            <Button
              onClick={() => {
                splitBillMutation.mutate({
                  transactionId: splitTransactionId,
                  numberOfSplits: Number(splitCount) || 2,
                });
              }}
              disabled={splitBillMutation.isPending || !splitTransactionId.trim() || Number(splitCount) < 2}
            >
              {splitBillMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Split Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Bill Dialog */}
      <Dialog open={mergeOpen} onOpenChange={(open) => { if (!open) { setMergeOpen(false); setMergeTransactionIds(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Bill</DialogTitle>
            <DialogDescription>
              Gabungkan beberapa tagihan menjadi satu. Masukkan ID transaksi yang ingin digabungkan, pisahkan dengan koma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="merge-transaction-ids">ID Transaksi</Label>
              <Input
                id="merge-transaction-ids"
                placeholder="contoh: txn-001, txn-002, txn-003"
                value={mergeTransactionIds}
                onChange={(e) => setMergeTransactionIds(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Pisahkan setiap ID transaksi dengan tanda koma.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setMergeOpen(false); setMergeTransactionIds(''); }}
              disabled={mergeBillMutation.isPending}
            >
              Batal
            </Button>
            <Button
              onClick={() => {
                const ids = mergeTransactionIds
                  .split(',')
                  .map((id) => id.trim())
                  .filter(Boolean);
                mergeBillMutation.mutate({ transactionIds: ids });
              }}
              disabled={
                mergeBillMutation.isPending ||
                mergeTransactionIds
                  .split(',')
                  .map((id) => id.trim())
                  .filter(Boolean).length < 2
              }
            >
              {mergeBillMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Merge Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
