import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatNumber, formatDuration } from '@/lib/format';
import { ChefHat, Clock, CheckCircle, AlertCircle, Flame } from 'lucide-react';
import { reportsApi } from '@/api/endpoints/reports.api';
import type { DateRange, KitchenReport as KitchenReportType } from '@/types/report.types';
import type { DateRange as DateRangeValue } from '@/components/shared/date-range-picker';

interface KitchenReportProps {
    outletId: string;
    dateRange: DateRange;
    customDateRange?: DateRangeValue;
}

export function KitchenReport({ outletId, dateRange, customDateRange }: KitchenReportProps) {
    const { data: reportData, isLoading } = useQuery<KitchenReportType>({
        queryKey: ['report', 'kitchen', outletId, dateRange, customDateRange],
        queryFn: () => reportsApi.kitchen({
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
                Tidak ada data dapur untuk periode ini
            </div>
        );
    }

    const completionRate = reportData.totalOrders > 0
        ? (reportData.completedOrders / reportData.totalOrders) * 100
        : 0;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Pesanan</CardTitle>
                        <ChefHat className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(reportData.totalOrders)}</div>
                        <p className="text-xs text-muted-foreground">Pesanan dapur</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Rata-rata Waktu</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatDuration(reportData.avgPrepTime)}</div>
                        <p className="text-xs text-muted-foreground">
                            Target: {formatDuration(reportData.targetPrepTime)}
                        </p>
                    </CardContent>
                </Card>

                <Card className={reportData.onTimeRate >= 85 ? 'border-green-200 dark:border-green-800/50' : 'border-amber-200 dark:border-amber-800/50'}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className={`text-sm font-medium ${reportData.onTimeRate >= 85 ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                            Tepat Waktu
                        </CardTitle>
                        {reportData.onTimeRate >= 85 ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${reportData.onTimeRate >= 85 ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                            {reportData.onTimeRate}%
                        </div>
                        <Progress value={reportData.onTimeRate} className="mt-2 h-2" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Tingkat Selesai</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">
                            {reportData.cancelledOrders} dibatalkan
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Peak Hours & Popular Items */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Flame className="h-4 w-4" />
                            Jam Sibuk
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {reportData.peakHours.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Belum ada data</p>
                        ) : (
                            <div className="space-y-3">
                                {reportData.peakHours.map((peak, i) => {
                                    const maxOrders = Math.max(...reportData.peakHours.map(p => p.orders));
                                    return (
                                        <div key={i} className="flex items-center justify-between">
                                            <span className="text-sm font-medium">{peak.hour}</span>
                                            <div className="flex items-center gap-2">
                                                <Progress value={(peak.orders / maxOrders) * 100} className="w-24 h-2" />
                                                <span className="text-sm text-muted-foreground w-16 text-right">
                                                    {peak.orders} pesanan
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ChefHat className="h-4 w-4" />
                            Menu Terpopuler
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {reportData.popularItems.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Belum ada data</p>
                        ) : (
                            <div className="space-y-3">
                                {reportData.popularItems.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                                                {i + 1}
                                            </span>
                                            <span className="text-sm font-medium">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="text-[10px]">
                                                {item.orders}x
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                ~{item.avgTime}m
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Slow Items Alert */}
            {reportData.slowItems.length > 0 && (
                <Card className="border-amber-200 dark:border-amber-800/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-400">
                            <AlertCircle className="h-4 w-4" />
                            Menu dengan Waktu Persiapan Lama
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {reportData.slowItems.map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                                    <span className="text-sm font-medium">{item.name}</span>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-amber-700 dark:text-amber-400">
                                            {item.avgTime} menit
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {item.orders} pesanan
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
