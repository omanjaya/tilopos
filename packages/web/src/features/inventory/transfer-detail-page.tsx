import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { inventoryApi } from '@/api/endpoints/inventory.api';
import { PageHeader } from '@/components/shared/page-header';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTransferSocket } from '@/hooks/realtime/use-transfer-socket';
import { useAuthStore } from '@/stores/auth.store';
import { TransferTimeline } from './components/transfer-timeline';
import { transferStatusConfig, transferPermissions } from './transfer-status';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/lib/toast-utils';
import { formatDateTime } from '@/lib/format';
import { ArrowLeft, CheckCircle, Truck, PackageCheck, Loader2, Info } from 'lucide-react';
import { handleMutationError } from '@/lib/api-error-handler';

export function TransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const { canApprove, canManage, canReceive } = transferPermissions(role);
  /** Received quantities edited by the user, keyed by stockTransferItemId (default = quantitySent). */
  const [receivedQty, setReceivedQty] = useState<Record<string, string>>({});

  // Real-time WebSocket updates
  useTransferSocket({
    onStatusChange: (payload) => {
      // Only refresh if this is the current transfer
      if (payload.transferId === id) {
        queryClient.invalidateQueries({ queryKey: ['stock-transfer', id] });
        queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      }
    },
    showNotifications: true,
  });

  const {
    data: transfer,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['stock-transfer', id],
    queryFn: () => inventoryApi.getTransfer(id!),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-transfer', id] });
    queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
  };

  const approveMutation = useMutation({
    mutationFn: () => inventoryApi.approveTransfer(id!),
    onSuccess: () => {
      invalidate();
      toast.success({ title: 'Transfer disetujui' });
    },
    onError: (err) => handleMutationError(err, 'Gagal menyetujui transfer'),
  });

  const shipMutation = useMutation({
    mutationFn: () => inventoryApi.shipTransfer(id!),
    onSuccess: () => {
      invalidate();
      toast.success({ title: 'Transfer ditandai dikirim' });
    },
    onError: (err) => handleMutationError(err, 'Gagal menandai pengiriman'),
  });

  const receiveMutation = useMutation({
    mutationFn: (items: { stockTransferItemId: string; quantityReceived: number }[]) =>
      inventoryApi.receiveTransfer(id!, items),
    onSuccess: () => {
      setReceivedQty({});
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
      toast.success({ title: 'Transfer diterima' });
    },
    onError: (err) => handleMutationError(err, 'Gagal menerima transfer'),
  });

  const isMutating = approveMutation.isPending || shipMutation.isPending || receiveMutation.isPending;

  const header = (
    <PageHeader title={transfer?.transferNumber ?? 'Detail Transfer'} description="Detail transfer stok">
      <Button variant="outline" onClick={() => navigate('/app/inventory/transfers')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
      </Button>
    </PageHeader>
  );

  if (isLoading) {
    return (
      <div>
        {header}
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </div>
    );
  }

  const isNotFound = isError && isAxiosError(error) && error.response?.status === 404;

  if (isError && !isNotFound) {
    return (
      <div>
        {header}
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  if (!transfer) {
    return (
      <div>
        {header}
        <p className="text-muted-foreground">Transfer tidak ditemukan.</p>
      </div>
    );
  }

  const statusConfig = transferStatusConfig(transfer.status);
  const isReceived = transfer.status === 'received';
  const isReceiving = transfer.status === 'in_transit' && canReceive;

  /** Only lines whose received quantity differs from what was sent are sent to the backend. */
  type ReceiveLine = { stockTransferItemId: string; quantityReceived: number };
  const buildReceiveItems = (): { items: ReceiveLine[] } | { error: string } => {
    const items: ReceiveLine[] = [];
    for (const item of transfer.items) {
      const raw = receivedQty[item.id];
      if (raw === undefined || raw === '') continue;
      const qty = Number(raw);
      if (!Number.isFinite(qty) || qty < 0 || qty > item.quantitySent) {
        return { error: `Jumlah diterima "${item.itemName}" harus antara 0 dan ${item.quantitySent}` };
      }
      if (qty !== item.quantitySent) items.push({ stockTransferItemId: item.id, quantityReceived: qty });
    }
    return { items };
  };

  const handleReceive = () => {
    const result = buildReceiveItems();
    if ('error' in result) {
      toast.error({ title: result.error });
      return;
    }
    receiveMutation.mutate(result.items);
  };

  return (
    <div>
      {header}

      {/* Transfer Timeline */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Status Transfer</CardTitle>
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <TransferTimeline
            currentStatus={transfer.status}
            requestedAt={transfer.createdAt}
            requestedBy={transfer.requestedByName}
            approvedAt={transfer.approvedAt}
            approvedBy={transfer.approvedByName}
            shippedAt={transfer.shippedAt}
            receivedAt={transfer.receivedAt}
            receivedBy={transfer.receivedByName}
          />
        </CardContent>
      </Card>

      {/* Info Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Informasi Transfer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Outlet Asal</p>
              <p className="text-sm font-medium">{transfer.sourceOutletName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Outlet Tujuan</p>
              <p className="text-sm font-medium">{transfer.destinationOutletName}</p>
            </div>
            {transfer.requestedByName && (
              <div>
                <p className="text-sm text-muted-foreground">Dibuat oleh</p>
                <p className="text-sm font-medium">{transfer.requestedByName}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Tanggal</p>
              <p className="text-sm font-medium">{formatDateTime(transfer.createdAt)}</p>
            </div>
            {transfer.approvedByName && (
              <div>
                <p className="text-sm text-muted-foreground">Disetujui oleh</p>
                <p className="text-sm font-medium">{transfer.approvedByName}</p>
              </div>
            )}
            {transfer.notes && (
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">Catatan</p>
                <p className="text-sm font-medium">{transfer.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isReceiving && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Isi kolom Qty Diterima bila jumlah yang tiba berbeda dari yang dikirim. Stok outlet asal
            berkurang sesuai jumlah dikirim, stok outlet tujuan bertambah sesuai jumlah diterima.
          </AlertDescription>
        </Alert>
      )}

      {/* Items Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Daftar Barang</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>Qty Dikirim</TableHead>
                  <TableHead>Qty Diterima</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfer.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.itemName}</TableCell>
                    <TableCell>{item.quantitySent}</TableCell>
                    <TableCell>
                      {isReceiving ? (
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={item.quantitySent}
                          step="any"
                          className="h-8 w-28"
                          aria-label={`Qty diterima ${item.itemName}`}
                          value={receivedQty[item.id] ?? String(item.quantitySent)}
                          onChange={(e) =>
                            setReceivedQty((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          disabled={isMutating}
                        />
                      ) : (
                      <span className="text-muted-foreground">
                        {item.quantityReceived !== null
                          ? item.quantityReceived
                          : isReceived
                            ? item.quantitySent
                            : '-'}
                      </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Separator className="mb-4" />
      <div className="flex justify-end gap-2">
        {transfer.status === 'pending' && canApprove && (
          <Button onClick={() => approveMutation.mutate()} disabled={isMutating}>
            {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CheckCircle className="mr-2 h-4 w-4" /> Setujui
          </Button>
        )}
        {transfer.status === 'approved' && canManage && (
          <Button onClick={() => shipMutation.mutate()} disabled={isMutating}>
            {shipMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Truck className="mr-2 h-4 w-4" /> Kirim
          </Button>
        )}
        {isReceiving && (
          <Button onClick={handleReceive} disabled={isMutating}>
            {receiveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <PackageCheck className="mr-2 h-4 w-4" /> Terima
          </Button>
        )}
      </div>
    </div>
  );
}
