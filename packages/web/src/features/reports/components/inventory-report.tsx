import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRupiah, formatNumber } from '@/lib/format';
import { Package, TrendingDown, AlertTriangle } from 'lucide-react';
import { reportsApi } from '@/api/endpoints/reports.api';
import { ReportErrorState } from '@/components/shared/report-error-state';
import type { InventoryReport as InventoryReportType } from '@/types/report.types';

interface InventoryReportProps {
    outletId: string;
}

/** Current stock snapshot of the outlet (the backend report has no period). */
export function InventoryReport({ outletId }: InventoryReportProps) {
    const { data: reportData, isLoading, error, refetch } = useQuery<InventoryReportType>({
        queryKey: ['report', 'inventory', outletId],
        queryFn: () => reportsApi.inventory({ outletId }),
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

    if (error) {
        return (
            <ReportErrorState
                title="Gagal memuat laporan inventaris"
                description="Terjadi kesalahan saat mengambil data stok."
                error={error as Error}
                onRetry={() => void refetch()}
            />
        );
    }

    if (!reportData || reportData.totalItems === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                Belum ada data stok untuk outlet ini
            </div>
        );
    }

    const attention = reportData.items
        .filter((item) => item.currentStock <= item.lowStockAlert)
        .sort((a, b) => a.currentStock - b.currentStock)
        .slice(0, 10);
    // Cost data (stock value) is null for roles without cost access
    const showValue = reportData.totalValue !== null;
    const topValue = showValue
        ? [...reportData.items].sort((a, b) => (b.stockValue ?? 0) - (a.stockValue ?? 0)).slice(0, 10)
        : [];

    return (
        <div className="space-y-6">
            <p className="text-xs text-muted-foreground">Posisi stok saat ini (tidak dipengaruhi filter periode).</p>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Item Stok</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(reportData.totalItems)}</div>
                        <p className="text-xs text-muted-foreground">Produk/varian dengan stok tercatat</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Nilai Stok</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{showValue ? formatRupiah(reportData.totalValue) : '-'}</div>
                        <p className="text-xs text-muted-foreground">
                            {showValue ? 'Berdasarkan harga pokok' : 'Tidak tersedia untuk peran Anda'}
                        </p>
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
                            {formatNumber(reportData.lowStockItems)}
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
                            {formatNumber(reportData.outOfStockItems)}
                        </div>
                        <p className="text-xs text-muted-foreground">Produk tidak tersedia</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <AlertTriangle className="h-4 w-4" />
                            Perlu Perhatian
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {attention.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Semua stok di atas batas minimum</p>
                        ) : (
                            <div className="space-y-3">
                                {attention.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between">
                                        <span className="text-sm font-medium">
                                            {item.productName}
                                            {item.variantName ? ` - ${item.variantName}` : ''}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            {formatNumber(item.currentStock)} {item.unit} (min {formatNumber(item.lowStockAlert)})
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {showValue && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Package className="h-4 w-4" />
                                Nilai Stok Terbesar
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {topValue.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between">
                                        <span className="text-sm font-medium">
                                            {item.productName}
                                            {item.variantName ? ` - ${item.variantName}` : ''}
                                        </span>
                                        <span className="text-sm text-muted-foreground">{formatRupiah(item.stockValue)}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
