import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/api/endpoints/orders.api';
import { PageHeader } from '@/components/shared/page-header';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
import { formatDateTime } from '@/lib/format';
import {
  ArrowLeft,
  Play,
  Check,
  HandPlatter,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  UtensilsCrossed,
  ClipboardList,
} from 'lucide-react';
import { isAxiosError } from 'axios';
import { ErrorState } from '@/components/shared/error-state';
import { orderStatusBadge, orderTypeBadge, CANCELLABLE_STATUSES } from './order-labels';
import { CancelOrderDialog } from './components/cancel-order-dialog';

type ForwardStatus = 'preparing' | 'ready' | 'served' | 'completed';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmStatus, setConfirmStatus] = useState<{ status: ForwardStatus; label: string } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id!),
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: ForwardStatus }) =>
      ordersApi.updateStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success({ title: 'Status pesanan berhasil diperbarui' });
      setConfirmStatus(null);
    },
    onError: (error) => handleMutationError(error, 'Gagal memperbarui status'),
  });

  if (isLoading) {
    return (
      <div>
        <PageHeader title="">
          <Button variant="outline" onClick={() => navigate('/app/orders')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
        </PageHeader>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const isNotFound = isAxiosError(error) && error.response?.status === 404;
  if (error && !isNotFound) {
    return (
      <div>
        <PageHeader title="Detail Pesanan">
          <Button variant="outline" onClick={() => navigate('/app/orders')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
        </PageHeader>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <PageHeader title="Pesanan Tidak Ditemukan" description="Pesanan yang Anda cari tidak ditemukan.">
          <Button variant="outline" onClick={() => navigate('/app/orders')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
        </PageHeader>
      </div>
    );
  }

  const status = orderStatusBadge(order.status);
  const orderType = orderTypeBadge(order.orderType);
  const canCancel = CANCELLABLE_STATUSES.includes(order.status);

  return (
    <div>
      <PageHeader
        title={order.orderNumber}
        description="Detail pesanan"
      >
        <Button variant="outline" onClick={() => navigate('/app/orders')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
        {(order.status === 'pending' || (order.status as string) === 'confirmed') && (
          <Button
            onClick={() => setConfirmStatus({ status: 'preparing', label: 'Proses' })}
          >
            <Play className="mr-2 h-4 w-4" /> Proses
          </Button>
        )}
        {order.status === 'preparing' && (
          <Button
            onClick={() => setConfirmStatus({ status: 'ready', label: 'Tandai Siap' })}
          >
            <Check className="mr-2 h-4 w-4" /> Tandai Siap
          </Button>
        )}
        {order.status === 'ready' && (
          <Button
            onClick={() => setConfirmStatus({ status: 'served', label: 'Tandai Disajikan' })}
          >
            <HandPlatter className="mr-2 h-4 w-4" /> Tandai Disajikan
          </Button>
        )}
        {order.status === 'served' && (
          <Button
            onClick={() => setConfirmStatus({ status: 'completed', label: 'Selesai' })}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" /> Selesai
          </Button>
        )}
        {canCancel && (
          <Button variant="destructive" onClick={() => setCancelOpen(true)}>
            <XCircle className="mr-2 h-4 w-4" /> Batalkan
          </Button>
        )}
      </PageHeader>

      <div className="space-y-6">
        {/* Summary Card */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-6 p-6">
            <Badge variant={status.variant} className="text-sm">
              {status.label}
            </Badge>
            <Separator orientation="vertical" className="h-8" />
            <Badge variant={orderType.variant} className="text-sm">
              {orderType.label}
            </Badge>
            <Separator orientation="vertical" className="h-8" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UtensilsCrossed className="h-4 w-4" />
              Meja: {order.tableName || '-'}
            </div>
            {order.customerName && (
              <>
                <Separator orientation="vertical" className="h-8" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  Pelanggan: {order.customerName}
                </div>
              </>
            )}
            <Separator orientation="vertical" className="h-8" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {formatDateTime(order.createdAt)}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {order.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Catatan Pesanan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{order.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Item Pesanan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(order.items ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                        Tidak ada item
                      </TableCell>
                    </TableRow>
                  ) : (
                    order.items.map((item) => {
                      const itemStatus = orderStatusBadge(item.status);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.notes || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={itemStatus.variant}>{itemStatus.label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={!!confirmStatus}
        onOpenChange={(open) => { if (!open) setConfirmStatus(null); }}
        title="Ubah Status Pesanan"
        description={`Ubah status pesanan "${order.orderNumber}" menjadi "${confirmStatus?.label}"?`}
        confirmLabel={confirmStatus?.label || 'Konfirmasi'}
        variant="default"
        onConfirm={() => {
          if (confirmStatus) {
            updateStatusMutation.mutate({
              orderId: order.id,
              status: confirmStatus.status,
            });
          }
        }}
        isLoading={updateStatusMutation.isPending}
      />

      <CancelOrderDialog
        order={cancelOpen ? order : null}
        onClose={() => setCancelOpen(false)}
      />
    </div>
  );
}
