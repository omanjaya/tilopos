import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionsApi } from '@/api/endpoints/promotions.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { MetricCard } from '@/components/shared/metric-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';
import { Loader2, Plus, Star, Coins, RefreshCw, Clock } from 'lucide-react';
import type { LoyaltyTier } from '@/types/promotion.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

export function LoyaltyPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [programName, setProgramName] = useState('');
  const [amountPerPoint, setAmountPerPoint] = useState('');
  const [redemptionRate, setRedemptionRate] = useState('');
  const [pointExpiryDays, setPointExpiryDays] = useState('');

  const {
    data: loyaltyProgram,
    isLoading: isProgramLoading,
    isError: isProgramError,
  } = useQuery({
    queryKey: ['loyalty-program'],
    queryFn: promotionsApi.getLoyaltyProgram,
    retry: false,
  });

  const { data: tiers, isLoading: isTiersLoading } = useQuery({
    queryKey: ['loyalty-tiers'],
    queryFn: promotionsApi.getLoyaltyTiers,
    enabled: !!loyaltyProgram,
  });

  const createMutation = useMutation({
    mutationFn: promotionsApi.createLoyaltyProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-program'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-tiers'] });
      toast({ title: 'Program loyalti berhasil dibuat' });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal membuat program',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const resetForm = () => {
    setProgramName('');
    setAmountPerPoint('');
    setRedemptionRate('');
    setPointExpiryDays('');
  };

  const handleCreateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name: programName,
      amountPerPoint: Number(amountPerPoint),
      redemptionRate: Number(redemptionRate),
      pointExpiryDays: pointExpiryDays ? Number(pointExpiryDays) : undefined,
    });
  };

  const tierColumns: Column<LoyaltyTier>[] = [
    {
      key: 'name',
      header: 'Nama Tier',
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'minPoints',
      header: 'Min Poin',
      cell: (row) => row.minPoints.toLocaleString('id-ID'),
    },
    {
      key: 'multiplier',
      header: 'Multiplier',
      cell: (row) => `${(row as unknown as Record<string, unknown>).pointMultiplier ?? row.multiplier ?? 1}x`,
    },
    {
      key: 'benefits',
      header: 'Benefits',
      cell: (row) => {
        const b = row.benefits;
        if (!b) return <span className="text-muted-foreground">-</span>;
        if (typeof b === 'string') return <span className="text-muted-foreground">{b}</span>;
        const discount = (b as Record<string, number>).discount;
        return <span className="text-muted-foreground">{discount ? `Diskon ${discount}%` : '-'}</span>;
      },
    },
  ];

  if (isProgramLoading) {
    return (
      <div>
        <PageHeader title="Program Loyalti" description="Kelola program loyalti pelanggan" />
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasProgramData = loyaltyProgram && !isProgramError;

  return (
    <div>
      <PageHeader title="Program Loyalti" description="Kelola program loyalti pelanggan">
        {!hasProgramData && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Buat Program
          </Button>
        )}
      </PageHeader>

      {!hasProgramData ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Star}
              title="Belum ada program loyalti"
              description="Buat program loyalti untuk meningkatkan retensi pelanggan."
              action={
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Buat Program
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Nama Program"
              value={loyaltyProgram.name}
              icon={Star}
            />
            <MetricCard
              title="Jumlah per Poin"
              value={formatCurrency(loyaltyProgram.amountPerPoint)}
              icon={Coins}
              description="Belanja untuk mendapat 1 poin"
            />
            <MetricCard
              title="Nilai Tukar"
              value={formatCurrency(loyaltyProgram.redemptionRate)}
              icon={RefreshCw}
              description="Nilai per 1 poin saat ditukar"
            />
            <MetricCard
              title="Masa Berlaku Poin"
              value={
                loyaltyProgram.pointExpiryDays !== null
                  ? `${loyaltyProgram.pointExpiryDays} hari`
                  : 'Tidak ada batas'
              }
              icon={Clock}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tier Loyalti</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={tierColumns}
                data={tiers ?? []}
                isLoading={isTiersLoading}
                emptyTitle="Belum ada tier"
                emptyDescription="Tier loyalti belum dikonfigurasi."
              />
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateProgram}>
            <DialogHeader>
              <DialogTitle>Buat Program Loyalti</DialogTitle>
              <DialogDescription>
                Konfigurasikan program loyalti untuk pelanggan Anda.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="programName">Nama Program</Label>
                <Input
                  id="programName"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  placeholder="Contoh: Poin Rewards"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amountPerPoint">Jumlah per Poin (Rp)</Label>
                <Input
                  id="amountPerPoint"
                  type="number"
                  min="1"
                  value={amountPerPoint}
                  onChange={(e) => setAmountPerPoint(e.target.value)}
                  placeholder="Contoh: 10000 (setiap Rp 10.000 = 1 poin)"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="redemptionRate">Nilai Tukar (Rp per poin)</Label>
                <Input
                  id="redemptionRate"
                  type="number"
                  min="1"
                  value={redemptionRate}
                  onChange={(e) => setRedemptionRate(e.target.value)}
                  placeholder="Contoh: 100 (1 poin = Rp 100)"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pointExpiryDays">Masa Berlaku Poin (hari)</Label>
                <Input
                  id="pointExpiryDays"
                  type="number"
                  min="1"
                  value={pointExpiryDays}
                  onChange={(e) => setPointExpiryDays(e.target.value)}
                  placeholder="Kosongkan untuk tidak ada batas"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={createMutation.isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="animate-spin" />}
                Buat Program
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
