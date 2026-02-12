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
import { formatCurrency } from '@/lib/format';
import { TrendingDown, DollarSign } from 'lucide-react';

interface SupplierComparisonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupplierComparisonModal({
  open,
  onOpenChange,
}: SupplierComparisonModalProps) {
  const { data: comparison, isLoading } = useQuery({
    queryKey: ['supplier-comparison'],
    queryFn: supplierAnalyticsApi.getSupplierComparison,
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Supplier Price Comparison</DialogTitle>
          <DialogDescription>
            Compare harga produk antar supplier untuk hemat biaya
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : comparison && comparison.comparisons.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-blue-900">
                <strong>{comparison.totalProducts} produk</strong> memiliki multiple suppliers.
                Potential savings dengan pilih supplier termurah!
              </p>
            </div>

            {comparison.comparisons.map((product) => (
              <Card key={product.productId}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{product.productName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {product.suppliers.length} suppliers available
                      </p>
                    </div>
                    {product.savingsPercentage > 0 && (
                      <Badge className="bg-green-600">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        Save {product.savingsPercentage.toFixed(1)}%
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    {product.suppliers.map((supplier, idx) => {
                      const isCheapest = idx === 0;
                      const isMostExpensive = idx === product.suppliers.length - 1;

                      return (
                        <div
                          key={supplier.supplierId}
                          className={`p-3 rounded-lg border ${
                            isCheapest
                              ? 'bg-green-50 border-green-300'
                              : isMostExpensive && product.suppliers.length > 1
                              ? 'bg-red-50 border-red-300'
                              : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                                  isCheapest
                                    ? 'bg-green-500 text-white'
                                    : isMostExpensive
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-300'
                                } font-bold text-sm`}
                              >
                                {idx + 1}
                              </div>
                              <div>
                                <p className="font-semibold">{supplier.supplierName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {supplier.orderCount}x order • Range:{' '}
                                  {formatCurrency(supplier.minPrice)} -{' '}
                                  {formatCurrency(supplier.maxPrice)}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <p
                                className={`text-xl font-bold ${
                                  isCheapest
                                    ? 'text-green-700'
                                    : isMostExpensive
                                    ? 'text-red-700'
                                    : 'text-gray-700'
                                }`}
                              >
                                {formatCurrency(supplier.avgPrice)}
                              </p>
                              {isCheapest && (
                                <Badge variant="default" className="bg-green-600 mt-1">
                                  💰 Termurah
                                </Badge>
                              )}
                              {isMostExpensive && product.suppliers.length > 1 && (
                                <Badge variant="destructive" className="mt-1">
                                  Termahal
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {product.priceDifference > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-900">
                        💡 <strong>Potential savings:</strong>{' '}
                        {formatCurrency(product.priceDifference)} per unit dengan pilih{' '}
                        <strong>{product.cheapestSupplier}</strong>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Belum ada data comparison</p>
            <p className="text-sm mt-1">
              Minimal 2 supplier harus punya order untuk produk yang sama
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
