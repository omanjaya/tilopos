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
import { toast } from '@/lib/toast-utils';
import { handleMutationError } from '@/lib/api-error-handler';
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
import type { Order } from '@/types/order.types';
import { useAuthStore } from '@/stores/auth.store';
import { ErrorState } from '@/components/shared/error-state';
import { orderStatusBadge } from './order-labels';
import { CancelOrderDialog } from './components/cancel-order-dialog';

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

const ORDER_TYPE_MAP: Record<string, { label: string; icon: React.ReactNode }> = {
  dine_in: { label: 'Makan di Tempat', icon: <ChefHat className="h-4 w-4" /> },
  takeaway: { label: 'Bawa Pulang', icon: <ShoppingBag className="h-4 w-4" /> },
  delivery: { label: 'Antar', icon: <ShoppingBag className="h-4 w-4" /> },
};

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'preparing', label: 'Diproses' },
  { value: 'ready', label: 'Siap' },
];

type ForwardStatus = 'preparing' | 'ready' | 'served' | 'completed';

interface StatusAction {
  label: string;
  status: ForwardStatus | 'cancelled';
  variant: 'default' | 'destructive';
  icon: React.ReactNode;
}

function getActionsForStatus(currentStatus: string): StatusAction[] {
  switch (currentStatus) {
    case 'pending':
    case 'confirmed':
      return [
        { label: 'Proses Pesanan', status: 'preparing', variant: 'default', icon: <Play className="h-5 w-5" /> },
        { label: 'Batalkan Pesanan', status: 'cancelled', variant: 'destructive', icon: <XCircle className="h-5 w-5" /> },
      ];
    case 'preparing':
      return [
        { label: 'Tandai Siap', status: 'ready', variant: 'default', icon: <Check className="h-5 w-5" /> },
        { label: 'Batalkan Pesanan', status: 'cancelled', variant: 'destructive', icon: <XCircle className="h-5 w-5" /> },
      ];
    case 'ready':
      return [
        { label: 'Tandai Disajikan', status: 'served', variant: 'default', icon: <HandPlatter className="h-5 w-5" /> },
        { label: 'Batalkan Pesanan', status: 'cancelled', variant: 'destructive', icon: <XCircle className="h-5 w-5" /> },
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
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const userOutletId = useAuthStore((s) => s.user?.outletId);
  // No outlet selected → backend lists every outlet the caller may access.
  const outletId = selectedOutletId || userOutletId || undefined;
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ order: Order; action: StatusAction } | null>(null);

  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: ['orders', outletId ?? 'all', 'active'],
    queryFn: () => ordersApi.list({ outletId }),
    refetchInterval: 30000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ForwardStatus }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success({ title: 'Status pesanan berhasil diperbarui' });
      setConfirmAction(null);
      setSelectedOrder(null);
    },
    onError: (error) => handleMutationError(error, 'Gagal memperbarui status'),
  });

  // Filter by search
  // Active orders only (backend default); status tabs filter them client-side.
  const filteredOrders = (orders || []).filter((order) => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
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
        {error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isLoading ? (
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
                    <Badge variant={orderStatusBadge(selectedOrder.status).variant}>
                      {orderStatusBadge(selectedOrder.status).label}
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
                      onClick={() =>
                        action.status === 'cancelled'
                          ? setCancelTarget(selectedOrder)
                          : setConfirmAction({ order: selectedOrder, action })
                      }
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
        onConfirm={() => {
          if (confirmAction && confirmAction.action.status !== 'cancelled') {
            updateStatusMutation.mutate({
              id: confirmAction.order.id,
              status: confirmAction.action.status,
            });
          }
        }}
        title={`Konfirmasi ${confirmAction?.action.label}`}
        description={`Apakah Anda yakin ingin ${confirmAction?.action.label.toLowerCase()} pesanan #${confirmAction?.order.orderNumber}?`}
        confirmLabel={confirmAction?.action.label || 'Konfirmasi'}
        isLoading={updateStatusMutation.isPending}
      />

      <CancelOrderDialog
        order={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onCancelled={() => setSelectedOrder(null)}
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
  const status = orderStatusBadge(order.status);
  const orderType = ORDER_TYPE_MAP[order.orderType];

  return (
    <Card
      className="overflow-hidden cursor-pointer active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Pesanan ${order.orderNumber}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
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
        </div>
      </CardContent>
    </Card>
  );
}
