import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatNumber, formatDuration, formatRupiah } from '@/lib/format';
import { Table2, Clock, Users, RotateCcw, TrendingUp } from 'lucide-react';
import { reportsApi } from '@/api/endpoints/reports.api';
import type { DateRange, TableReport as TableReportType } from '@/types/report.types';
import type { DateRange as DateRangeValue } from '@/components/shared/date-range-picker';

interface TableReportProps {
    outletId: string;
    dateRange: DateRange;
    customDateRange?: DateRangeValue;
}

export function TableReport({ outletId, dateRange, customDateRange }: TableReportProps) {
    const { data: reportData, isLoading } = useQuery<TableReportType>({
        queryKey: ['report', 'table', outletId, dateRange, customDateRange],
        queryFn: () => reportsApi.table({
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
                Tidak ada data meja untuk periode ini
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Meja</CardTitle>
                        <Table2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(reportData.totalTables)}</div>
                        <p className="text-xs text-muted-foreground">Meja tersedia</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Rata-rata Okupansi</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reportData.avgOccupancy}%</div>
                        <Progress value={reportData.avgOccupancy} className="mt-2 h-2" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Durasi Makan</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatDuration(reportData.avgDiningTime)}</div>
                        <p className="text-xs text-muted-foreground">Rata-rata per meja</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Table Turnover</CardTitle>
                        <RotateCcw className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reportData.turnoverRate}x</div>
                        <p className="text-xs text-muted-foreground">Per hari per meja</p>
                    </CardContent>
                </Card>
            </div>

            {/* Table Performance & Peak Hours */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <TrendingUp className="h-4 w-4" />
                            Performa Meja
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {reportData.tablePerformance.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Belum ada data</p>
                        ) : (
                            <div className="space-y-3">
                                {reportData.tablePerformance.map((table, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                        <div>
                                            <span className="text-sm font-medium">{table.name}</span>
                                            <p className="text-xs text-muted-foreground">
                                                {table.turnover}x turnover • ~{table.avgTime}m
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium">{formatRupiah(table.revenue)}</p>
                                            <Badge variant={i < 3 ? 'default' : 'secondary'} className="text-[10px]">
                                                {i < 3 ? 'Top' : 'Low'}
                                            </Badge>
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
                            <Clock className="h-4 w-4" />
                            Jam Ramai
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {reportData.peakDiningHours.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Belum ada data</p>
                        ) : (
                            <div className="space-y-3">
                                {reportData.peakDiningHours.map((peak, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <span className="text-sm font-medium">{peak.hour}</span>
                                        <div className="flex items-center gap-2">
                                            <Progress value={peak.occupancy} className="w-20 h-2" />
                                            <span className="text-sm text-muted-foreground w-12 text-right">
                                                {peak.occupancy}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Guest Stats */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Users className="h-4 w-4" />
                        Statistik Tamu
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="text-center p-4 rounded-lg bg-muted/50">
                            <div className="text-2xl font-bold text-primary">{formatNumber(reportData.totalGuests)}</div>
                            <p className="text-sm text-muted-foreground">Total Tamu</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-muted/50">
                            <div className="text-2xl font-bold text-primary">{reportData.avgGuestsPerTable}</div>
                            <p className="text-sm text-muted-foreground">Rata-rata per Meja</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-muted/50">
                            <div className="text-2xl font-bold text-primary">
                                {reportData.totalTables > 0 ? Math.round(reportData.totalGuests / reportData.totalTables) : 0}
                            </div>
                            <p className="text-sm text-muted-foreground">Tamu per Hari per Meja</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
