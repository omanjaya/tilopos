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
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/format';
import {
  ArrowLeft,
  Play,
  Check,
  HandPlatter,
  CheckCircle2,
  XCircle,
  Calendar,
  UserCheck,
  User,
  UtensilsCrossed,
  ClipboardList,
} from 'lucide-react';
import type { OrderStatus, OrderType } from '@/types/order.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

const STATUS_MAP: Record<OrderStatus, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
  pending: { label: 'Menunggu', variant: 'secondary' },
  preparing: { label: 'Diproses', variant: 'outline' },
  ready: { label: 'Siap', variant: 'default' },
  served: { label: 'Disajikan', variant: 'default' },
  completed: { label: 'Selesai', variant: 'default' },
  cancelled: { label: 'Dibatalkan', variant: 'destructive' },
};

const ORDER_TYPE_MAP: Record<OrderType, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
  dine_in: { label: 'Dine In', variant: 'default' },
  take_away: { label: 'Take Away', variant: 'secondary' },
  delivery: { label: 'Delivery', variant: 'outline' },
};

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmStatus, setConfirmStatus] = useState<{ status: OrderStatus; label: string; variant: 'default' | 'destructive' } | null>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id!),
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      ordersApi.updateStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Status pesanan berhasil diperbarui' });
      setConfirmStatus(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal memperbarui status',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
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

  const status = STATUS_MAP[order.status];
  const orderType = ORDER_TYPE_MAP[order.orderType];

  return (
    <div>
      <PageHeader
        title={order.orderNumber}
        description="Detail pesanan"
      >
        <Button variant="outline" onClick={() => navigate('/app/orders')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
        {order.status === 'pending' && (
          <>
            <Button
              onClick={() => setConfirmStatus({ status: 'preparing', label: 'Proses', variant: 'default' })}
            >
              <Play className="mr-2 h-4 w-4" /> Proses
            </Button>
            <Button
              variant="destructive"
              onClick={() => setConfirmStatus({ status: 'cancelled', label: 'Batalkan', variant: 'destructive' })}
            >
              <XCircle className="mr-2 h-4 w-4" /> Batalkan
            </Button>
          </>
        )}
        {order.status === 'preparing' && (
          <Button
            onClick={() => setConfirmStatus({ status: 'ready', label: 'Tandai Siap', variant: 'default' })}
          >
            <Check className="mr-2 h-4 w-4" /> Tandai Siap
          </Button>
        )}
        {order.status === 'ready' && (
          <Button
            onClick={() => setConfirmStatus({ status: 'served', label: 'Tandai Disajikan', variant: 'default' })}
          >
            <HandPlatter className="mr-2 h-4 w-4" /> Tandai Disajikan
          </Button>
        )}
        {order.status === 'served' && (
          <Button
            onClick={() => setConfirmStatus({ status: 'completed', label: 'Selesai', variant: 'default' })}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" /> Selesai
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
            <Separator orientation="vertical" className="h-8" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserCheck className="h-4 w-4" />
              Kasir: {order.employeeName}
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
                  {order.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                        Tidak ada item
                      </TableCell>
                    </TableRow>
                  ) : (
                    order.items.map((item) => {
                      const itemStatus = STATUS_MAP[item.status];
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
        title={
          confirmStatus?.variant === 'destructive'
            ? 'Batalkan Pesanan'
            : 'Ubah Status Pesanan'
        }
        description={
          confirmStatus?.variant === 'destructive'
            ? `Apakah Anda yakin ingin membatalkan pesanan "${order.orderNumber}"? Tindakan ini tidak dapat dibatalkan.`
            : `Ubah status pesanan "${order.orderNumber}" menjadi "${confirmStatus?.label}"?`
        }
        confirmLabel={confirmStatus?.label || 'Konfirmasi'}
        variant={confirmStatus?.variant === 'destructive' ? 'destructive' : 'default'}
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
    </div>
  );
}
