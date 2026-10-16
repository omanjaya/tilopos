import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tablesApi } from '@/api/endpoints/tables.api';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { can } from '@/config/permissions';
import { PageHeader } from '@/components/shared/page-header';
import { ErrorState } from '@/components/shared/error-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
import { cn } from '@/lib/utils';
import { Scissors, Merge, Loader2, LayoutGrid, List, Plus, Trash2, Users } from 'lucide-react';
import { TableLayoutEditor } from './components/table-layout-editor';
import { SplitBillForm, MergeBillForm } from './components/bill-forms';
import { STATUS_COLORS, STATUS_LABELS, toTableStatus } from './utils/table-layout.utils';
import type { LayoutTable } from './types/layout.types';
import type { TableApiResponse } from '@/api/endpoints/tables.api';

export function TablesPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'list' | 'layout'>('list');
  const [splitOpen, setSplitOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');
  const [newSection, setNewSection] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<TableApiResponse | null>(null);

  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const userOutletId = useAuthStore((s) => s.user?.outletId);
  const role = useAuthStore((s) => s.user?.role);
  const canManageTables = can(role, 'tables.manage');
  const canDeleteTables = can(role, 'tables.delete');
  const outletId = selectedOutletId || userOutletId || '';

  const {
    data: tablesData,
    isLoading: isLoadingTables,
    error: tablesError,
    refetch: refetchTables,
  } = useQuery({
    queryKey: ['tables', outletId],
    queryFn: () => tablesApi.list({ outletId, activeOnly: true }),
    enabled: !!outletId,
  });

  // Map API response to LayoutTable format for the layout editor
  const layoutTables: LayoutTable[] = useMemo(() => {
    if (!tablesData) return [];
    return tablesData.map((table, index) => ({
      id: table.id,
      name: table.name,
      capacity: table.capacity,
      status: toTableStatus(table.status),
      section: table.section || 'Default',
      gridX: table.positionX ?? 1 + (index % 4) * 3,
      gridY: table.positionY ?? 1 + Math.floor(index / 4) * 3,
      gridW: 2,
      gridH: 2,
      currentOrderId: table.currentOrderId ?? undefined,
      occupiedAt: table.occupiedAt ?? undefined,
    }));
  }, [tablesData]);

  const invalidateTables = () => queryClient.invalidateQueries({ queryKey: ['tables'] });

  /** Persists moved tables via PUT /tables/:id; throws so the editor keeps unsaved moves. */
  const savePositions = async (positions: Array<{ id: string; gridX: number; gridY: number }>) => {
    const results = await Promise.allSettled(
      positions.map((p) => tablesApi.update(p.id, { positionX: p.gridX, positionY: p.gridY })),
    );
    const failed = results.filter((r) => r.status === 'rejected');
    await invalidateTables();
    if (failed.length > 0) {
      const firstError = (failed[0] as PromiseRejectedResult).reason;
      handleMutationError(firstError, `Gagal menyimpan ${failed.length} posisi meja`);
      throw firstError;
    }
    toast.success({
      title: 'Posisi meja disimpan',
      description: `${positions.length} meja berhasil diperbarui`,
    });
  };

  const resetCreate = () => {
    setCreateOpen(false);
    setNewName('');
    setNewCapacity('4');
    setNewSection('');
  };

  const createMutation = useMutation({
    mutationFn: () =>
      tablesApi.create({
        outletId,
        name: newName.trim(),
        capacity: Number(newCapacity) || undefined,
        section: newSection.trim() || undefined,
      }),
    onSuccess: () => {
      void invalidateTables();
      toast.success({ title: 'Meja berhasil ditambahkan' });
      resetCreate();
    },
    onError: (error) => handleMutationError(error, 'Gagal menambah meja'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tablesApi.remove(id),
    onSuccess: () => {
      void invalidateTables();
      toast.success({ title: 'Meja dinonaktifkan' });
      setDeleteTarget(null);
    },
    onError: (error) => handleMutationError(error, 'Gagal menonaktifkan meja'),
  });

  const renderTablesBody = () => {
    if (!outletId) {
      return (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Pilih outlet terlebih dahulu untuk melihat meja.
          </CardContent>
        </Card>
      );
    }
    if (tablesError) {
      return <ErrorState error={tablesError} onRetry={() => void refetchTables()} />;
    }
    if (isLoadingTables) {
      return (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      );
    }
    if (layoutTables.length === 0) {
      return (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <LayoutGrid className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Belum ada meja. Tambahkan meja terlebih dahulu.
            </p>
          </CardContent>
        </Card>
      );
    }
    if (viewMode === 'layout') {
      return (
        <TableLayoutEditor tables={layoutTables} editable={canManageTables} onSavePositions={savePositions} />
      );
    }
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {(tablesData ?? []).map((table) => {
          const status = toTableStatus(table.status);
          return (
            <Card key={table.id} className={cn('border-2', STATUS_COLORS[status])}>
              <CardContent className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-semibold">{table.name}</p>
                  {canDeleteTables && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    aria-label={`Nonaktifkan meja ${table.name}`}
                    onClick={() => setDeleteTarget(table)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Users className="h-3 w-3" /> {table.capacity} orang
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[status]}</Badge>
                  {table.section && (
                    <Badge variant="secondary" className="text-[10px]">{table.section}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Manajemen Meja" description="Kelola meja restoran Anda" />

        <div className="flex items-center gap-2 shrink-0">
          {canManageTables && (
            <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!outletId}>
              <Plus className="mr-1.5 h-4 w-4" /> Tambah Meja
            </Button>
          )}
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-1.5"
              aria-pressed={viewMode === 'list'}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Daftar</span>
            </Button>
            <Button
              variant={viewMode === 'layout' ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-1.5"
              aria-pressed={viewMode === 'layout'}
              onClick={() => setViewMode('layout')}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Denah</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-6">{renderTablesBody()}</div>

      {/* Action Cards — the inner button is the only interactive element */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Scissors className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="mt-3">Pisah Tagihan</CardTitle>
            <CardDescription>
              Bagi satu tagihan menjadi beberapa bagian untuk memudahkan pembayaran terpisah.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => setSplitOpen(true)}>
              Pisah Tagihan
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Merge className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="mt-3">Gabung Tagihan</CardTitle>
            <CardDescription>
              Gabungkan beberapa tagihan menjadi satu tagihan untuk pembayaran sekaligus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => setMergeOpen(true)}>
              Gabung Tagihan
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Split Bill Dialog */}
      <Dialog open={splitOpen} onOpenChange={setSplitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pisah Tagihan</DialogTitle>
            <DialogDescription>Bagi tagihan sama rata menjadi beberapa pembayaran.</DialogDescription>
          </DialogHeader>
          {splitOpen && (
            <SplitBillForm onDone={() => setSplitOpen(false)} onCancel={() => setSplitOpen(false)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Merge Bill Dialog */}
      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gabung Tagihan</DialogTitle>
            <DialogDescription>Gabungkan beberapa tagihan menjadi satu.</DialogDescription>
          </DialogHeader>
          {mergeOpen && (
            <MergeBillForm onDone={() => setMergeOpen(false)} onCancel={() => setMergeOpen(false)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Create Table Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) resetCreate(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Meja</DialogTitle>
            <DialogDescription>Meja baru akan ditambahkan ke outlet yang dipilih.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="table-name">Nama Meja</Label>
              <Input id="table-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="contoh: A1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="table-capacity">Kapasitas</Label>
              <Input id="table-capacity" type="number" min={1} value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="table-section">Area (opsional)</Label>
              <Input id="table-section" value={newSection} onChange={(e) => setNewSection(e.target.value)} placeholder="contoh: Teras" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetCreate} disabled={createMutation.isPending}>
              Batal
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !newName.trim()}
              aria-busy={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Nonaktifkan Meja"
        description={`Nonaktifkan meja "${deleteTarget?.name}"? Meja tidak akan muncul lagi di daftar.`}
        confirmLabel="Nonaktifkan"
        variant="destructive"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
