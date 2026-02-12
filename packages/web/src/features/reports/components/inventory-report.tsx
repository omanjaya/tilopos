import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRupiah, formatNumber } from '@/lib/format';
import { Package, TrendingDown, AlertTriangle, RotateCcw } from 'lucide-react';
import { reportsApi } from '@/api/endpoints/reports.api';
import type { DateRange, InventoryReport as InventoryReportType } from '@/types/report.types';
import type { DateRange as DateRangeValue } from '@/components/shared/date-range-picker';

interface InventoryReportProps {
    outletId: string;
    dateRange: DateRange;
    customDateRange?: DateRangeValue;
}

export function InventoryReport({ outletId, dateRange, customDateRange }: InventoryReportProps) {
    const { data: reportData, isLoading } = useQuery<InventoryReportType>({
        queryKey: ['report', 'inventory', outletId, dateRange, customDateRange],
        queryFn: () => reportsApi.inventory({
            outletId,
            dateRange,
            startDate: customDateRange?.from?.toISOString(),
            endDate: customDateRange?.to?.toISOString(),
        }),
        enabled: !!outletId,
    });

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-32" />
                ))}
            </div>
        );
    }

    if (!reportData) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                Tidak ada data inventaris untuk periode ini
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(reportData.totalProducts)}</div>
                        <p className="text-xs text-muted-foreground">Produk terdaftar</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Nilai Stok</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatRupiah(reportData.totalStockValue)}</div>
                        <p className="text-xs text-muted-foreground">Total nilai inventaris</p>
                    </CardContent>
                </Card>

                <Card className="border-amber-200 dark:border-amber-800/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">
                            Stok Rendah
                        </CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                            {formatNumber(reportData.lowStockCount)}
                        </div>
                        <p className="text-xs text-muted-foreground">Produk perlu restock</p>
                    </CardContent>
                </Card>

                <Card className="border-red-200 dark:border-red-800/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">
                            Stok Habis
                        </CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                            {formatNumber(reportData.outOfStockCount)}
                        </div>
                        <p className="text-xs text-muted-foreground">Produk tidak tersedia</p>
                    </CardContent>
                </Card>
            </div>

            {/* Stock Movements */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <RotateCcw className="h-4 w-4" />
                            Produk Terlaris
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!reportData.topMovingProducts?.length ? (
                            <p className="text-sm text-muted-foreground">Belum ada data pergerakan</p>
                        ) : (
                            <div className="space-y-3">
                                {reportData.topMovingProducts.map((product, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                                                {i + 1}
                                            </span>
                                            <span className="text-sm font-medium">{product.name}</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {product.movements} pergerakan
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <TrendingDown className="h-4 w-4" />
                            Produk Lambat Terjual
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!reportData.slowMovingProducts?.length ? (
                            <p className="text-sm text-muted-foreground">Belum ada data</p>
                        ) : (
                            <div className="space-y-3">
                                {reportData.slowMovingProducts.map((product, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <span className="text-sm font-medium">{product.name}</span>
                                        <span className="text-sm text-muted-foreground">
                                            {product.daysSinceLastSale} hari tidak terjual
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
