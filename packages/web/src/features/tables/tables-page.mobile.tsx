import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { tablesApi } from '@/api/endpoints/tables.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MobileNavSpacer } from '@/components/shared/mobile-nav';
import { useToast } from '@/hooks/use-toast';
import { Scissors, Merge, Loader2, Info } from 'lucide-react';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

/**
 * TablesPage Mobile Version
 *
 * Mobile-optimized table management with:
 * - List view only (layout too complex for mobile)
 * - Split Bill & Merge Bill action cards
 * - Bottom sheets for actions
 * - Touch-optimized controls
 */

export function TablesPage() {
  const { toast } = useToast();

  const [splitOpen, setSplitOpen] = useState(false);
  const [splitTransactionId, setSplitTransactionId] = useState('');
  const [splitCount, setSplitCount] = useState('2');

  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeTransactionIds, setMergeTransactionIds] = useState('');

  const splitBillMutation = useMutation({
    mutationFn: (data: { transactionId: string; numberOfSplits: number }) =>
      tablesApi.splitBill(data),
    onSuccess: () => {
      toast({ title: 'Bill berhasil di-split' });
      closeSplitSheet();
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
      closeMergeSheet();
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal merge bill',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  function closeSplitSheet() {
    setSplitOpen(false);
    setSplitTransactionId('');
    setSplitCount('2');
  }

  function closeMergeSheet() {
    setMergeOpen(false);
    setMergeTransactionIds('');
  }

  function handleSplitBill() {
    splitBillMutation.mutate({
      transactionId: splitTransactionId,
      numberOfSplits: Number(splitCount) || 2,
    });
  }

  function handleMergeBill() {
    const ids = mergeTransactionIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    mergeBillMutation.mutate({ transactionIds: ids });
  }

  const canSplit = splitTransactionId.trim() && Number(splitCount) >= 2;
  const canMerge = mergeTransactionIds
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean).length >= 2;

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="px-4 py-3">
          <div>
            <h1 className="text-xl font-bold">Manajemen Meja</h1>
            <p className="text-sm text-muted-foreground">
              Kelola tagihan meja restoran
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Info Notice */}
        <Card className="mb-4 border-blue-200 bg-blue-50/50">
          <CardContent className="flex items-start gap-3 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Fitur CRUD meja belum tersedia</p>
              <p className="mt-1 text-blue-600">
                Saat ini Anda dapat menggunakan Split Bill dan Merge Bill untuk mengelola tagihan.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Cards */}
        <div className="space-y-3">
          {/* Split Bill Card */}
          <Card
            className="cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => setSplitOpen(true)}
          >
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Scissors className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">Split Bill</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Bagi satu tagihan menjadi beberapa bagian untuk pembayaran terpisah
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Merge Bill Card */}
          <Card
            className="cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => setMergeOpen(true)}
          >
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-600/10">
                  <Merge className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">Merge Bill</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Gabungkan beberapa tagihan menjadi satu untuk pembayaran sekaligus
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Spacer for bottom nav */}
        <div className="h-4" />
      </div>

      {/* Mobile Nav Spacer */}
      <MobileNavSpacer />

      {/* Split Bill Sheet */}
      <Sheet open={splitOpen} onOpenChange={(open) => !open && closeSplitSheet()}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle>Split Bill</SheetTitle>
            <SheetDescription>
              Bagi tagihan menjadi beberapa bagian pembayaran
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="split-transaction-id">ID Transaksi</Label>
              <Input
                id="split-transaction-id"
                placeholder="Masukkan ID transaksi..."
                value={splitTransactionId}
                onChange={(e) => setSplitTransactionId(e.target.value)}
                className="h-12 mt-2"
              />
            </div>

            <div>
              <Label htmlFor="split-count">Jumlah Bagian</Label>
              <Input
                id="split-count"
                type="number"
                min="2"
                max="10"
                placeholder="2"
                value={splitCount}
                onChange={(e) => setSplitCount(e.target.value)}
                className="h-12 mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimal 2 bagian, maksimal 10 bagian
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4">
              <Button
                className="w-full h-12"
                onClick={handleSplitBill}
                disabled={!canSplit || splitBillMutation.isPending}
              >
                {splitBillMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Split Bill
              </Button>
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={closeSplitSheet}
                disabled={splitBillMutation.isPending}
              >
                Batal
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Merge Bill Sheet */}
      <Sheet open={mergeOpen} onOpenChange={(open) => !open && closeMergeSheet()}>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle>Merge Bill</SheetTitle>
            <SheetDescription>
              Gabungkan beberapa tagihan menjadi satu
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="merge-transaction-ids">ID Transaksi</Label>
              <Input
                id="merge-transaction-ids"
                placeholder="contoh: txn-001, txn-002, txn-003"
                value={mergeTransactionIds}
                onChange={(e) => setMergeTransactionIds(e.target.value)}
                className="h-12 mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pisahkan setiap ID transaksi dengan tanda koma
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4">
              <Button
                className="w-full h-12"
                onClick={handleMergeBill}
                disabled={!canMerge || mergeBillMutation.isPending}
              >
                {mergeBillMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Merge Bill
              </Button>
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={closeMergeSheet}
                disabled={mergeBillMutation.isPending}
              >
                Batal
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
