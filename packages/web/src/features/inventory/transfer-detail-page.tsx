import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '@/api/endpoints/inventory.api';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTransferSocket } from '@/hooks/realtime/use-transfer-socket';
import { TransferTimeline } from './components/transfer-timeline';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/format';
import { ArrowLeft, CheckCircle, Truck, PackageCheck, Loader2, AlertTriangle } from 'lucide-react';
import type { TransferStatus } from '@/types/inventory.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

const STATUS_CONFIG: Record<TransferStatus, { label: string; className: string }> = {
  requested: { label: 'Diminta', className: 'bg-blue-500 hover:bg-blue-600' },
  approved: { label: 'Disetujui', className: 'bg-yellow-500 hover:bg-yellow-600' },
  shipped: { label: 'Dikirim', className: 'bg-purple-500 hover:bg-purple-600' },
  in_transit: { label: 'Dikirim', className: 'bg-purple-500 hover:bg-purple-600' },
  received: { label: 'Diterima', className: 'bg-green-500 hover:bg-green-600' },
  cancelled: { label: 'Dibatalkan', className: 'bg-red-500 hover:bg-red-600' },
};

const WORKFLOW_STEPS: { status: TransferStatus; label: string }[] = [
  { status: 'requested', label: 'Diminta' },
  { status: 'approved', label: 'Disetujui' },
  { status: 'shipped', label: 'Dikirim' },
  { status: 'received', label: 'Diterima' },
];

function getStepIndex(status: TransferStatus): number {
  const idx = WORKFLOW_STEPS.findIndex((s) => s.status === status);
  return idx >= 0 ? idx : -1;
}

export function TransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, string>>({});

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

  const { data: transfer, isLoading } = useQuery({
    queryKey: ['stock-transfer', id],
    queryFn: () => inventoryApi.getTransfer(id!),
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: () => inventoryApi.approveTransfer(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfer', id] });
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      toast({ title: 'Transfer disetujui' });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal menyetujui transfer',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const shipMutation = useMutation({
    mutationFn: () => inventoryApi.shipTransfer(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfer', id] });
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      toast({ title: 'Transfer ditandai dikirim' });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal menandai pengiriman',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const receiveMutation = useMutation({
    mutationFn: () => {
      const items = transfer!.items.map((item) => ({
        stockTransferItemId: item.id,
        receivedQuantity: Number(receivedQuantities[item.id] ?? item.requestedQuantity),
      }));
      return inventoryApi.receiveTransfer(id!, items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfer', id] });
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      toast({ title: 'Transfer diterima' });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal menerima transfer',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  const isMutating = approveMutation.isPending || shipMutation.isPending || receiveMutation.isPending;
  const currentStepIndex = transfer ? getStepIndex(transfer.status) : -1;

  // Calculate discrepancies
  const discrepancies = useMemo(() => {
    if (!transfer || transfer.status !== 'shipped') return [];

    return transfer.items
      .map((item) => {
        const receivedQty = Number(receivedQuantities[item.id] ?? item.requestedQuantity);
        const sentQty = item.requestedQuantity;
        const diff = receivedQty - sentQty;

        if (diff !== 0) {
          return {
            itemName: item.itemName,
            sent: sentQty,
            received: receivedQty,
            difference: diff,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [transfer, receivedQuantities]);

  const hasDiscrepancies = discrepancies.length > 0;

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Detail Transfer">
          <Button variant="outline" onClick={() => navigate('/app/inventory/transfers')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
        </PageHeader>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div>
        <PageHeader title="Detail Transfer">
          <Button variant="outline" onClick={() => navigate('/app/inventory/transfers')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
        </PageHeader>
        <p className="text-muted-foreground">Transfer tidak ditemukan.</p>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[transfer.status];

  return (
    <div>
      <PageHeader title={transfer.transferNumber} description="Detail transfer stok">
        <Button variant="outline" onClick={() => navigate('/app/inventory/transfers')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
      </PageHeader>

      {/* Transfer Timeline */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Status Transfer</CardTitle>
            <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <TransferTimeline
            currentStatus={transfer.status}
            requestedAt={transfer.createdAt}
            requestedBy={transfer.requestedBy}
            approvedAt={transfer.approvedAt}
            approvedBy={transfer.approvedBy}
            shippedAt={transfer.shippedAt}
            receivedAt={transfer.receivedAt}
            receivedBy={transfer.receivedBy}
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
            <div>
              <p className="text-sm text-muted-foreground">Dibuat oleh</p>
              <p className="text-sm font-medium">{transfer.requestedBy}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tanggal</p>
              <p className="text-sm font-medium">{formatDateTime(transfer.createdAt)}</p>
            </div>
            {transfer.approvedBy && (
              <div>
                <p className="text-sm text-muted-foreground">Disetujui oleh</p>
                <p className="text-sm font-medium">{transfer.approvedBy}</p>
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

      {/* Discrepancy Warning */}
      {hasDiscrepancies && transfer.status === 'shipped' && (
        <Alert className="mb-6 border-yellow-500 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-900">Terdeteksi Perbedaan Quantity!</AlertTitle>
          <AlertDescription className="text-yellow-800">
            <p className="mb-2">
              Ada {discrepancies.length} item dengan quantity berbeda dari yang dikirim:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {discrepancies.map((disc: any, idx: number) => (
                <li key={idx}>
                  <strong>{disc.itemName}</strong>: Dikirim {disc.sent}, Diterima {disc.received}
                  {disc.difference > 0 && <span className="text-green-700"> (+{disc.difference})</span>}
                  {disc.difference < 0 && <span className="text-red-700"> ({disc.difference})</span>}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs">
              ℹ️ Pastikan quantity yang diterima sudah sesuai. System akan menyesuaikan stok berdasarkan quantity yang Anda input.
            </p>
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
                  <TableHead>Qty Diminta</TableHead>
                  <TableHead>Qty Diterima</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfer.items.map((item) => {
                  const receivedQty = Number(receivedQuantities[item.id] ?? item.requestedQuantity);
                  const hasDiff = receivedQty !== item.requestedQuantity;

                  return (
                    <TableRow key={item.id} className={hasDiff && transfer.status === 'shipped' ? 'bg-yellow-50' : ''}>
                      <TableCell className="font-medium">
                        {item.productName}
                        {hasDiff && transfer.status === 'shipped' && (
                          <AlertTriangle className="inline ml-2 h-3 w-3 text-yellow-600" />
                        )}
                      </TableCell>
                      <TableCell>{item.requestedQuantity}</TableCell>
                      <TableCell>
                        {transfer.status === 'shipped' ? (
                          <Input
                            type="number"
                            min={0}
                            className={`w-24 ${hasDiff ? 'border-yellow-500 border-2' : ''}`}
                            value={receivedQuantities[item.id] ?? String(item.requestedQuantity)}
                            onChange={(e) =>
                              setReceivedQuantities((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          <span className="text-muted-foreground">
                            {item.receivedQuantity !== null ? item.receivedQuantity : '-'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Separator className="mb-4" />
      <div className="flex justify-end gap-2">
        {transfer.status === 'requested' && (
          <Button onClick={() => approveMutation.mutate()} disabled={isMutating}>
            {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CheckCircle className="mr-2 h-4 w-4" /> Setujui
          </Button>
        )}
        {transfer.status === 'approved' && (
          <Button onClick={() => shipMutation.mutate()} disabled={isMutating}>
            {shipMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Truck className="mr-2 h-4 w-4" /> Kirim
          </Button>
        )}
        {transfer.status === 'shipped' && (
          <Button onClick={() => receiveMutation.mutate()} disabled={isMutating}>
            {receiveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <PackageCheck className="mr-2 h-4 w-4" /> Terima
          </Button>
        )}
      </div>
    </div>
  );
}
