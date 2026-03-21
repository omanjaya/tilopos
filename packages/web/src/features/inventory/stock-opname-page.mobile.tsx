import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockOpnameApi } from '@/api/endpoints/stock-opname.api';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { MobileNavSpacer } from '@/components/shared/mobile-nav';
import { toast } from '@/lib/toast-utils';
import { formatDateTime } from '@/lib/format';
import { Plus, Loader2, ClipboardCheck } from 'lucide-react';
import { handleMutationError } from '@/lib/api-error-handler';
import type { StockOpname, StockOpnameStatus } from '@/types/stock-opname.types';

const STATUS_CONFIG: Record<StockOpnameStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  in_progress: { label: 'Berlangsung', variant: 'warning' },
  completed: { label: 'Selesai', variant: 'success' },
  cancelled: { label: 'Dibatalkan', variant: 'destructive' },
};

export function StockOpnamePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [createNotes, setCreateNotes] = useState('');

  const { data: opnames, isLoading } = useQuery({
    queryKey: ['stock-opname', statusFilter],
    queryFn: () =>
      stockOpnameApi.list({
        outletId: user?.outletId || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: stockOpnameApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname'] });
      toast.success({ title: 'Stock opname berhasil dibuat' });
      setShowCreate(false);
      setCreateNotes('');
      if (data?.id) navigate(`/app/inventory/stock-opname/${data.id}`);
    },
    onError: (error) => handleMutationError(error, 'Gagal membuat stock opname'),
  });

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <h1 className="text-lg font-bold">Stock Opname</h1>
          <p className="text-sm text-muted-foreground">Hitung fisik stok</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Buat
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="px-4">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">Semua</TabsTrigger>
            <TabsTrigger value="in_progress" className="flex-1">Berlangsung</TabsTrigger>
            <TabsTrigger value="completed" className="flex-1">Selesai</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* List */}
      <div className="space-y-3 px-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : opnames && opnames.length > 0 ? (
          opnames.map((opname: StockOpname) => {
            const config = STATUS_CONFIG[opname.status];
            return (
              <Card
                key={opname.id}
                className="cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => navigate(`/app/inventory/stock-opname/${opname.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{opname.opnameNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {opname.outlet?.name} &bull; {formatDateTime(opname.createdAt)}
                      </p>
                    </div>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{opname.countedCount}/{opname.itemCount} dihitung</span>
                    {opname.discrepancyCount > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        {opname.discrepancyCount} selisih
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Belum ada stock opname
          </div>
        )}
      </div>

      <MobileNavSpacer />

      {/* Create Sheet */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Buat Stock Opname
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Semua produk yang dilacak stoknya akan dimasukkan.
            </p>
            <div className="space-y-2">
              <Label>Catatan (opsional)</Label>
              <Textarea
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                placeholder="Catatan untuk sesi opname..."
                rows={3}
              />
            </div>
          </div>
          <SheetFooter>
            <Button
              className="w-full"
              onClick={() => {
                if (!user?.outletId) {
                  toast.error({ title: 'Outlet tidak ditemukan' });
                  return;
                }
                createMutation.mutate({
                  outletId: user.outletId,
                  notes: createNotes || undefined,
                });
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Buat Opname
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
