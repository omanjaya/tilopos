import { useQuery } from '@tanstack/react-query';
import { supplierAnalyticsApi } from '@/api/endpoints/supplier-analytics.api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/format';
import { AlertTriangle, Package, TrendingDown } from 'lucide-react';

interface ReorderAlertsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReorderAlertsModal({ open, onOpenChange }: ReorderAlertsModalProps) {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['reorder-alerts'],
    queryFn: supplierAnalyticsApi.getReorderAlerts,
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Auto Reorder Alerts
          </DialogTitle>
          <DialogDescription>
            Produk dengan stok rendah yang perlu segera di-order
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : alerts && alerts.alerts.length > 0 ? (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500 text-white">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-900">
                        {formatNumber(alerts.totalAlerts)}
                      </p>
                      <p className="text-sm text-orange-700">Total low stock items</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500 text-white">
                      <TrendingDown className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-900">
                        {formatNumber(alerts.criticalAlerts)}
                      </p>
                      <p className="text-sm text-red-700">Critical (≤5 units)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alerts List */}
            <div className="space-y-3">
              {alerts.alerts.map((alert) => {
                const isCritical = alert.currentStock <= 5;

                return (
                  <Card
                    key={`${alert.productId}-${alert.outletName}`}
                    className={
                      isCritical
                        ? 'border-red-300 bg-red-50'
                        : 'border-orange-200 bg-orange-50'
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg">{alert.productName}</h3>
                            {isCritical && (
                              <Badge variant="destructive">🚨 CRITICAL</Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="text-muted-foreground">
                              <strong>SKU:</strong> {alert.sku}
                            </p>
                            <p className="text-muted-foreground">
                              <strong>Outlet:</strong> {alert.outletName}
                            </p>
                            <p
                              className={`font-semibold ${
                                isCritical ? 'text-red-700' : 'text-orange-700'
                              }`}
                            >
                              <Package className="inline h-4 w-4 mr-1" />
                              Stok tersisa: <strong>{alert.currentStock} units</strong>
                            </p>
                          </div>
                        </div>

                        <div className="text-right ml-4">
                          {alert.recommendedSupplier ? (
                            <div className="p-3 bg-white rounded-lg border min-w-[200px]">
                              <p className="text-xs text-muted-foreground mb-1">
                                Recommended Supplier
                              </p>
                              <p className="font-bold text-blue-600">
                                {alert.recommendedSupplier.name}
                              </p>
                              <p className="text-sm text-muted-foreground mt-2">
                                Last price:
                              </p>
                              <p className="text-lg font-bold">
                                {formatCurrency(alert.recommendedSupplier.lastPrice)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Suggested order:
                              </p>
                              <p className="text-md font-semibold text-green-600">
                                {alert.suggestedOrderQuantity} units
                              </p>
                            </div>
                          ) : (
                            <div className="p-3 bg-white rounded-lg border">
                              <p className="text-sm text-muted-foreground">
                                No supplier history
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Suggested order:
                              </p>
                              <p className="text-md font-semibold text-green-600">
                                {alert.suggestedOrderQuantity} units
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-600" />
            <p className="text-lg font-semibold text-green-700">Semua stok aman! ✅</p>
            <p className="text-sm mt-1">Tidak ada produk dengan stok rendah</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
