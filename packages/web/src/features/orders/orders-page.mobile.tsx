import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/api/endpoints/orders.api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { MobileNavSpacer } from '@/components/shared/mobile-nav';
import { useToast } from '@/hooks/use-toast';
import { useUIStore } from '@/stores/ui.store';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  Search,
  Play,
  Check,
  HandPlatter,
  CheckCircle2,
  XCircle,
  Clock,
  ChefHat,
  Eye,
  ShoppingBag,
} from 'lucide-react';
import type { Order, OrderStatus } from '@/types/order.types';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/api.types';

/**
 * OrdersPage Mobile Version
 *
 * Mobile-optimized orders list with:
 * - Card-based layout
 * - Status tabs
 * - Tap card to view detail
 * - Sheet menu for status actions
 * - Search orders
 */

const STATUS_MAP: Record<OrderStatus, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary'; color: string }> = {
  pending: { label: 'Menunggu', variant: 'secondary', color: 'text-yellow-600' },
  preparing: { label: 'Diproses', variant: 'outline', color: 'text-blue-600' },
  ready: { label: 'Siap', variant: 'default', color: 'text-green-600' },
  served: { label: 'Disajikan', variant: 'default', color: 'text-primary' },
  completed: { label: 'Selesai', variant: 'default', color: 'text-muted-foreground' },
  cancelled: { label: 'Dibatalkan', variant: 'destructive', color: 'text-destructive' },
};

const ORDER_TYPE_MAP: Record<string, { label: string; icon: React.ReactNode }> = {
  dine_in: { label: 'Dine In', icon: <ChefHat className="h-4 w-4" /> },
  take_away: { label: 'Take Away', icon: <ShoppingBag className="h-4 w-4" /> },
  takeaway: { label: 'Take Away', icon: <ShoppingBag className="h-4 w-4" /> },
  delivery: { label: 'Delivery', icon: <ShoppingBag className="h-4 w-4" /> },
};

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'preparing', label: 'Diproses' },
  { value: 'ready', label: 'Siap' },
];

interface StatusAction {
  label: string;
  status: OrderStatus;
  variant: 'default' | 'destructive';
  icon: React.ReactNode;
}

function getActionsForStatus(currentStatus: OrderStatus): StatusAction[] {
  switch (currentStatus) {
    case 'pending':
      return [
        { label: 'Proses Pesanan', status: 'preparing', variant: 'default', icon: <Play className="h-5 w-5" /> },
        { label: 'Batalkan Pesanan', status: 'cancelled', variant: 'destructive', icon: <XCircle className="h-5 w-5" /> },
      ];
    case 'preparing':
      return [
        { label: 'Tandai Siap', status: 'ready', variant: 'default', icon: <Check className="h-5 w-5" /> },
      ];
    case 'ready':
      return [
        { label: 'Tandai Disajikan', status: 'served', variant: 'default', icon: <HandPlatter className="h-5 w-5" /> },
      ];
    case 'served':
      return [
        { label: 'Selesai', status: 'completed', variant: 'default', icon: <CheckCircle2 className="h-5 w-5" /> },
      ];
    default:
      return [];
  }
}

export function OrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ order: Order; action: StatusAction } | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', selectedOutletId, statusFilter],
    queryFn: () =>
      ordersApi.list({
        outletId: selectedOutletId || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
    refetchInterval: 30000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Status pesanan berhasil diperbarui' });
      setConfirmAction(null);
      setSelectedOrder(null);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast({
        variant: 'destructive',
        title: 'Gagal memperbarui status',
        description: error.response?.data?.message || 'Terjadi kesalahan',
      });
    },
  });

  // Filter by search
  const filteredOrders = (orders?.data || []).filter((order) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(searchLower) ||
      order.tableName?.toLowerCase().includes(searchLower) ||
      order.customerName?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold">Pesanan</h1>
              <p className="text-sm text-muted-foreground">
                {filteredOrders.length} pesanan
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari pesanan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          {/* Status Tabs */}
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-auto">
              {STATUS_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="text-xs py-2"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted/50 p-6 mb-4">
              <Clock className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">Belum ada pesanan</h3>
            <p className="text-sm text-muted-foreground">
              Pesanan akan muncul di sini
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => setSelectedOrder(order)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mobile Nav Spacer */}
      <MobileNavSpacer />

      {/* Order Detail Sheet */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <SheetContent side="bottom" className="h-[85vh]">
          {selectedOrder && (
            <>
              <SheetHeader>
                <SheetTitle>Pesanan #{selectedOrder.orderNumber}</SheetTitle>
                <SheetDescription>
                  {formatDateTime(selectedOrder.createdAt)}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                {/* Order Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={STATUS_MAP[selectedOrder.status].variant}>
                      {STATUS_MAP[selectedOrder.status].label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tipe</span>
                    <div className="flex items-center gap-2">
                      {ORDER_TYPE_MAP[selectedOrder.orderType]?.icon}
                      <span className="text-sm font-medium">
                        {ORDER_TYPE_MAP[selectedOrder.orderType]?.label || selectedOrder.orderType}
                      </span>
                    </div>
                  </div>
                  {selectedOrder.tableName && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Meja</span>
                      <span className="text-sm font-medium">{selectedOrder.tableName}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Kasir</span>
                    <span className="text-sm font-medium">{selectedOrder.employeeName}</span>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="font-semibold mb-2">Item Pesanan</h3>
                  <div className="space-y-2">
                    {(selectedOrder.items || []).map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between py-2 border-b last:border-0">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity}x
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-12"
                    onClick={() => navigate(`/app/orders/${selectedOrder.id}`)}
                  >
                    <Eye className="mr-3 h-5 w-5" />
                    Lihat Detail Lengkap
                  </Button>

                  {getActionsForStatus(selectedOrder.status).map((action) => (
                    <Button
                      key={action.status}
                      variant="outline"
                      className={cn(
                        'w-full justify-start h-12',
                        action.variant === 'destructive' &&
                          'text-destructive hover:text-destructive hover:bg-destructive/10'
                      )}
                      onClick={() => setConfirmAction({ order: selectedOrder, action })}
                    >
                      {action.icon && <span className="mr-3">{action.icon}</span>}
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm Action Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        onConfirm={() =>
          confirmAction &&
          updateStatusMutation.mutate({
            id: confirmAction.order.id,
            status: confirmAction.action.status,
          })
        }
        title={`Konfirmasi ${confirmAction?.action.label}`}
        description={`Apakah Anda yakin ingin ${confirmAction?.action.label.toLowerCase()} pesanan #${confirmAction?.order.orderNumber}?`}
        confirmText={confirmAction?.action.label || 'Konfirmasi'}
        loading={updateStatusMutation.isPending}
      />
    </div>
  );
}

/**
 * OrderCard Component
 * Individual order card
 */
interface OrderCardProps {
  order: Order;
  onClick: () => void;
}

function OrderCard({ order, onClick }: OrderCardProps) {
  const status = STATUS_MAP[order.status];
  const orderType = ORDER_TYPE_MAP[order.orderType];

  return (
    <Card className="overflow-hidden cursor-pointer active:scale-[0.98] transition-transform" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base">#{order.orderNumber}</h3>
              <Badge variant={status.variant} className="text-xs">
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(order.createdAt)}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          {order.tableName && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Meja:</span>
              <span className="font-medium">{order.tableName}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            {orderType?.icon}
            <span className="text-muted-foreground">{orderType?.label || order.orderType}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{(order.items || []).length} item</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Kasir:</span>
            <span>{order.employeeName}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
