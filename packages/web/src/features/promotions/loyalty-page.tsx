import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionsApi } from '@/api/endpoints/promotions.api';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type Column } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
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
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
import { formatCurrency } from '@/lib/format';
import { Loader2, Plus, Star, Coins, RefreshCw, Clock, Pencil } from 'lucide-react';
import type { LoyaltyTier } from '@/types/promotion.types';

function formatBenefits(benefits: LoyaltyTier['benefits']): string {
  if (!benefits) return '-';
  if (typeof benefits === 'string') return benefits;
  if (Array.isArray(benefits)) return benefits.length > 0 ? benefits.join(', ') : '-';
  const discount = benefits.discount;
  return typeof discount === 'number' && discount > 0 ? `Diskon ${discount}%` : '-';
}

export function LoyaltyPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [programName, setProgramName] = useState('');
  const [amountPerPoint, setAmountPerPoint] = useState('');
  const [redemptionRate, setRedemptionRate] = useState('');
  const [pointExpiryDays, setPointExpiryDays] = useState('');

  const {
    data: loyaltyProgram,
    isLoading: isProgramLoading,
    isError: isProgramError,
    error: programError,
    refetch: refetchProgram,
  } = useQuery({
    queryKey: ['loyalty-program'],
    queryFn: promotionsApi.getLoyaltyProgram,
  });

  const {
    data: tiers,
    isLoading: isTiersLoading,
    isError: isTiersError,
    error: tiersError,
    refetch: refetchTiers,
  } = useQuery({
    queryKey: ['loyalty-tiers'],
    queryFn: promotionsApi.getLoyaltyTiers,
    enabled: !!loyaltyProgram,
  });

  const createMutation = useMutation({
    mutationFn: promotionsApi.createLoyaltyProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-program'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-tiers'] });
      toast.success({ title: 'Program loyalti berhasil dibuat' });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => handleMutationError(error, 'Gagal membuat program'),
  });

  const updateMutation = useMutation({
    mutationFn: promotionsApi.updateLoyaltyProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-program'] });
      toast.success({ title: 'Program loyalti berhasil diperbarui' });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => handleMutationError(error, 'Gagal memperbarui program'),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const openCreate = () => {
    resetForm();
    setIsEditing(false);
    setDialogOpen(true);
  };

  const openEdit = () => {
    if (!loyaltyProgram) return;
    setProgramName(loyaltyProgram.name);
    setAmountPerPoint(String(loyaltyProgram.amountPerPoint));
    setRedemptionRate(String(loyaltyProgram.redemptionRate));
    setPointExpiryDays(
      loyaltyProgram.pointExpiryDays !== null && loyaltyProgram.pointExpiryDays !== undefined
        ? String(loyaltyProgram.pointExpiryDays)
        : '',
    );
    setIsEditing(true);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setProgramName('');
    setAmountPerPoint('');
    setRedemptionRate('');
    setPointExpiryDays('');
  };

  const handleSubmitProgram = (e: React.FormEvent) => {
    e.preventDefault();
    const mutation = isEditing ? updateMutation : createMutation;
    mutation.mutate({
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
      key: 'pointMultiplier',
      header: 'Pengali Poin',
      cell: (row) => `${Number(row.pointMultiplier ?? 1)}x`,
    },
    {
      key: 'benefits',
      header: 'Keuntungan',
      cell: (row) => <span className="text-muted-foreground">{formatBenefits(row.benefits)}</span>,
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

  if (isProgramError) {
    return (
      <div>
        <PageHeader title="Program Loyalti" description="Kelola program loyalti pelanggan" />
        <ErrorState error={programError} onRetry={() => refetchProgram()} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Program Loyalti" description="Kelola program loyalti pelanggan">
        {loyaltyProgram ? (
          <Button variant="outline" onClick={openEdit}>
            <Pencil className="mr-2 h-4 w-4" /> Ubah Program
          </Button>
        ) : (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Buat Program
          </Button>
        )}
      </PageHeader>

      {!loyaltyProgram ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Star}
              title="Belum ada program loyalti"
              description="Buat program loyalti untuk meningkatkan retensi pelanggan."
              action={
                <Button onClick={openCreate}>
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
                loyaltyProgram.pointExpiryDays
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
              {isTiersError ? (
                <ErrorState error={tiersError} onRetry={() => refetchTiers()} />
              ) : (
              <DataTable
                columns={tierColumns}
                data={tiers ?? []}
                isLoading={isTiersLoading}
                emptyTitle="Belum ada tier"
                emptyDescription="Tier loyalti belum dikonfigurasi."
              />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmitProgram}>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Ubah Program Loyalti' : 'Buat Program Loyalti'}</DialogTitle>
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
                disabled={isSaving}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="animate-spin" />}
                {isEditing ? 'Simpan Perubahan' : 'Buat Program'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
