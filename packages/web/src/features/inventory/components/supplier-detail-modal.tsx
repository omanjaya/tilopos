import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supplierAnalyticsApi } from '@/api/endpoints/supplier-analytics.api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber, formatDate } from '@/lib/format';
import {
  History,
  Wallet,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
} from 'lucide-react';
import type { Supplier } from '@/types/inventory.types';
import { ErrorState } from '@/components/shared/error-state';

const PO_STATUS_LABEL: Record<string, string> = {
  draft: 'Draf',
  ordered: 'Dipesan',
  partial: 'Diterima Sebagian',
  received: 'Diterima',
  cancelled: 'Dibatalkan',
};

interface SupplierDetailModalProps {
  supplier: Supplier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupplierDetailModal({
  supplier,
  open,
  onOpenChange,
}: SupplierDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'payment'>('history');

  // Purchase History
  const {
    data: history,
    isLoading: historyLoading,
    isError: historyError,
    error: historyErrorObj,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['supplier-history', supplier?.id],
    queryFn: () => supplierAnalyticsApi.getPurchaseHistory(supplier!.id, { dateRange: 'this_month' }),
    enabled: open && !!supplier && activeTab === 'history',
  });

  // Payment Status
  const {
    data: payment,
    isLoading: paymentLoading,
    isError: paymentError,
    error: paymentErrorObj,
    refetch: refetchPayment,
  } = useQuery({
    queryKey: ['supplier-payment', supplier?.id],
    queryFn: () => supplierAnalyticsApi.getPaymentStatus(supplier!.id),
    enabled: open && !!supplier && activeTab === 'payment',
  });

  if (!supplier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            {supplier.name}
          </DialogTitle>
          <DialogDescription>
            {supplier.contactName && `Kontak: ${supplier.contactName}`}
            {supplier.phone && ` • ${supplier.phone}`}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Riwayat Pembelian
            </TabsTrigger>
            <TabsTrigger value="payment" className="gap-2">
              <Wallet className="h-4 w-4" />
              Status Pesanan
            </TabsTrigger>
          </TabsList>

          {/* Purchase History Tab */}
          <TabsContent value="history" className="space-y-4 mt-4">
            {historyLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-32" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : historyError ? (
              <ErrorState error={historyErrorObj} onRetry={() => refetchHistory()} />
            ) : history ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">
                        Total Pembelian
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-success">
                        {formatCurrency(history.summary.totalPurchases)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatNumber(history.summary.totalOrders)} pesanan
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">
                        Rata-rata Order
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-info">
                        {formatCurrency(history.summary.avgOrderValue)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Per pesanan</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span>Selesai:</span>
                          <Badge variant="default" className="text-xs">
                            {history.summary.statusCounts.completed}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span>Belum selesai:</span>
                          <Badge variant="outline" className="text-xs">
                            {history.summary.statusCounts.pending}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Orders List */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Pesanan Terbaru</h3>
                  {history.orders.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Belum ada riwayat pembelian bulan ini
                    </p>
                  ) : (
                    history.orders.map((order) => (
                      <Card key={order.id} className="hover:bg-accent/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold">{order.orderNumber}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(order.orderDate)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-success">
                                {formatCurrency(order.totalAmount)}
                              </p>
                              <Badge
                                variant={
                                  order.status === 'received'
                                    ? 'default'
                                    : order.status === 'ordered'
                                    ? 'outline'
                                    : 'secondary'
                                }
                                className="mt-1"
                              >
                                {PO_STATUS_LABEL[order.status] ?? order.status}
                              </Badge>
                            </div>
                          </div>

                          {/* Items */}
                          <div className="border-t pt-2 space-y-1">
                            {order.items.slice(0, 3).map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="text-muted-foreground">
                                  {item.productName} x{item.quantity}
                                </span>
                                <span className="font-medium">
                                  {formatCurrency(item.subtotal)}
                                </span>
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{order.items.length - 3} item lainnya
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Tidak ada data pembelian
              </p>
            )}
          </TabsContent>

          {/* Order status tab — the backend has no supplier payment ledger; it derives
              "paid" from PO status = received, so this is shown as a PO status summary. */}
          <TabsContent value="payment" className="space-y-4 mt-4">
            {paymentLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-32" />
                <Skeleton className="h-24" />
              </div>
            ) : paymentError ? (
              <ErrorState error={paymentErrorObj} onRetry={() => refetchPayment()} />
            ) : payment ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Pencatatan pembayaran ke supplier belum tersedia. Ringkasan ini berdasarkan status penerimaan PO.
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4 text-warning" />
                        PO Belum Diterima
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {formatCurrency(payment.summary.openAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {payment.summary.openOrdersCount} pesanan
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        PO Diterima
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-success">
                        {formatCurrency(payment.summary.receivedAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {payment.summary.receivedRate.toFixed(1)}% dari total
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-info" />
                        Total Pembelian
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-info">
                        {formatCurrency(payment.summary.totalPurchases)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Sepanjang waktu</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Pesanan Belum Diterima</h3>
                  {payment.openOrders.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Semua pesanan ke supplier ini sudah diterima
                    </p>
                  ) : (
                    payment.openOrders.map((order) => (
                      <Card key={order.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{order.orderNumber}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Tanggal pesan: {formatDate(order.orderDate)}
                              </p>
                            </div>
                            <p className="text-lg font-bold">{formatCurrency(order.totalAmount)}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </>
            ) : null}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
