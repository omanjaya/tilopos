import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/format';
import { ChefHat, Clock, CheckCircle, AlertCircle, Flame } from 'lucide-react';
import { reportsApi } from '@/api/endpoints/reports.api';
import { ReportErrorState } from '@/components/shared/report-error-state';
import { reportDateParams } from '../report-date-params';
import type { DateRange, KitchenReport as KitchenReportType } from '@/types/report.types';
import type { DateRange as DateRangeValue } from '@/components/shared/date-range-picker';

interface KitchenReportProps {
    outletId: string;
    dateRange: DateRange;
    customDateRange?: DateRangeValue;
}

const STATION_LABELS: Record<string, string> = {
    unassigned: 'Tanpa stasiun',
};

function formatMinutes(value: number): string {
    return `${value.toLocaleString('id-ID', { maximumFractionDigits: 1 })} menit`;
}

export function KitchenReport({ outletId, dateRange, customDateRange }: KitchenReportProps) {
    const { startDate, endDate, ready } = reportDateParams(dateRange, customDateRange);
    const { data: reportData, isLoading, error, refetch } = useQuery<KitchenReportType>({
        queryKey: ['report', 'kitchen', outletId, dateRange, startDate, endDate],
        queryFn: () => reportsApi.kitchen({ outletId, dateRange, startDate, endDate }),
        enabled: !!outletId && ready,
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
                title="Gagal memuat laporan dapur"
                description="Terjadi kesalahan saat mengambil data laporan dapur."
                error={error as Error}
                onRetry={() => void refetch()}
            />
        );
    }

    if (!reportData || reportData.summary.totalOrders === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                Tidak ada data dapur untuk periode ini
            </div>
        );
    }

    const { summary } = reportData;
    const completionRate = summary.totalOrders > 0
        ? (summary.completedOrders / summary.totalOrders) * 100
        : 0;
    const onTime = summary.slaAdherenceRate;
    const onTimeGood = onTime >= 85;
    const peakHours = reportData.peakHours.slice(0, 8);
    const maxOrders = Math.max(1, ...peakHours.map((p) => p.orderCount));
    const topItems = reportData.itemsPreparedByProduct.slice(0, 10);

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
                        <div className="text-2xl font-bold">{formatNumber(summary.totalOrders)}</div>
                        <p className="text-xs text-muted-foreground">
                            {summary.ordersPerHour.toLocaleString('id-ID')} pesanan/jam
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Rata-rata Waktu</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatMinutes(summary.avgPrepTimeMinutes)}</div>
                        <p className="text-xs text-muted-foreground">
                            Target: {formatMinutes(summary.slaTargetMinutes)}
                        </p>
                    </CardContent>
                </Card>

                <Card className={onTimeGood ? 'border-green-200 dark:border-green-800/50' : 'border-amber-200 dark:border-amber-800/50'}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className={`text-sm font-medium ${onTimeGood ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                            Tepat Waktu
                        </CardTitle>
                        {onTimeGood ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${onTimeGood ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                            {onTime}%
                        </div>
                        <Progress value={onTime} className="mt-2 h-2" />
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
                            {formatNumber(summary.completedOrders)} dari {formatNumber(summary.totalOrders)} selesai
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
                        {peakHours.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Belum ada data</p>
                        ) : (
                            <div className="space-y-3">
                                {peakHours.map((peak) => (
                                    <div key={peak.hour} className="flex items-center justify-between">
                                        <span className="text-sm font-medium">
                                            {String(peak.hour).padStart(2, '0')}:00
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <Progress value={(peak.orderCount / maxOrders) * 100} className="w-24 h-2" />
                                            <span className="text-sm text-muted-foreground w-20 text-right">
                                                {peak.orderCount} pesanan
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ChefHat className="h-4 w-4" />
                            Menu Terbanyak Disiapkan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {topItems.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Belum ada data</p>
                        ) : (
                            <div className="space-y-3">
                                {topItems.map((item, i) => (
                                    <div key={item.productId} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                                                {i + 1}
                                            </span>
                                            <span className="text-sm font-medium">{item.productName}</span>
                                        </div>
                                        <Badge variant="secondary" className="text-[10px]">
                                            {formatNumber(item.totalPrepared)}x
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Stations */}
            {reportData.stations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Clock className="h-4 w-4" />
                            Kinerja per Stasiun
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {reportData.stations.map((st) => (
                                <div key={st.station} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                    <span className="text-sm font-medium">{STATION_LABELS[st.station] ?? st.station}</span>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{formatMinutes(st.avgPrepMinutes)}</Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {formatNumber(st.totalQuantity)} item
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
