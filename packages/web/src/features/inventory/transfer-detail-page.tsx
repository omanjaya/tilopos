import { useState } from 'react';
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
import { ArrowLeft, CheckCircle, Truck, PackageCheck, Loader2 } from 'lucide-react';
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

      {/* Status Badge */}
      <div className="mb-6">
        <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
      </div>

      {/* Workflow Stepper */}
      {transfer.status !== 'cancelled' && (
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {WORKFLOW_STEPS.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              return (
                <div key={step.status} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium ${
                        isCompleted
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/30 text-muted-foreground'
                      } ${isCurrent ? 'ring-2 ring-primary/30' : ''}`}
                    >
                      {index + 1}
                    </div>
                    <span
                      className={`mt-1 text-xs ${
                        isCompleted ? 'font-medium text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < WORKFLOW_STEPS.length - 1 && (
                    <div
                      className={`mx-2 h-0.5 flex-1 ${
                        index < currentStepIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                {transfer.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell>{item.requestedQuantity}</TableCell>
                    <TableCell>
                      {transfer.status === 'shipped' ? (
                        <Input
                          type="number"
                          min={0}
                          max={item.requestedQuantity}
                          className="w-24"
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
                ))}
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
