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
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
} from 'lucide-react';
import type { Supplier } from '@/types/inventory.types';

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
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['supplier-history', supplier?.id],
    queryFn: () => supplierAnalyticsApi.getPurchaseHistory(supplier!.id, { dateRange: 'this_month' }),
    enabled: open && !!supplier && activeTab === 'history',
  });

  // Payment Status
  const { data: payment, isLoading: paymentLoading } = useQuery({
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
            📦 {supplier.name}
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
              Purchase History
            </TabsTrigger>
            <TabsTrigger value="payment" className="gap-2">
              <Wallet className="h-4 w-4" />
              Payment Status
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
                        {formatNumber(history.summary.totalOrders)} orders
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
                          <span>Completed:</span>
                          <Badge variant="default" className="text-xs">
                            {history.summary.statusCounts.completed}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span>Pending:</span>
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
                  <h3 className="font-semibold text-sm">Recent Orders</h3>
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
                                {order.status}
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
                                +{order.items.length - 3} items lainnya
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

          {/* Payment Status Tab */}
          <TabsContent value="payment" className="space-y-4 mt-4">
            {paymentLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-32" />
                <Skeleton className="h-24" />
              </div>
            ) : payment ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className={payment.summary.totalDebt > 0 ? 'border-destructive/20' : ''}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        Total Hutang
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-destructive">
                        {formatCurrency(payment.summary.totalDebt)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {payment.summary.unpaidOrdersCount} orders belum lunas
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        Sudah Dibayar
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-success">
                        {formatCurrency(payment.summary.totalPaid)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {payment.summary.paymentRate.toFixed(1)}% dari total
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
                      <p className="text-xs text-muted-foreground mt-1">All time</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Overdue Orders Alert */}
                {payment.overdueOrders.length > 0 && (
                  <Card className="border-destructive/30 bg-destructive/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-destructive flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        ⚠️ {payment.overdueOrders.length} Order Terlambat
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {payment.overdueOrders.slice(0, 3).map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between bg-white p-3 rounded-lg"
                        >
                          <div>
                            <p className="font-semibold text-sm">{order.orderNumber}</p>
                            <p className="text-xs text-destructive">
                              {order.daysOverdue} hari terlambat
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-destructive">
                              {formatCurrency(order.outstandingAmount)}
                            </p>
                            <p className="text-xs text-muted-foreground">belum dibayar</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Unpaid Orders */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Unpaid Orders</h3>
                  {payment.unpaidOrders.length === 0 ? (
                    <Card className="border-success/20 bg-success/5">
                      <CardContent className="p-6 text-center">
                        <CheckCircle className="h-12 w-12 text-success mx-auto mb-2" />
                        <p className="font-semibold text-success">Semua Lunas! 🎉</p>
                        <p className="text-sm text-success mt-1">
                          Tidak ada hutang dengan supplier ini
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    payment.unpaidOrders.map((order) => (
                      <Card key={order.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{order.orderNumber}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Order: {formatDate(order.orderDate)}
                                {order.dueDate && ` • Jatuh tempo: ${formatDate(order.dueDate)}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-destructive">
                                {formatCurrency(order.outstandingAmount)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                dari {formatCurrency(order.totalAmount)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Tidak ada data pembayaran
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
