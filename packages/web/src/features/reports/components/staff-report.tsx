import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatRupiah, formatNumber } from '@/lib/format';
import { Users, Star, Clock, Trophy, TrendingUp } from 'lucide-react';
import { reportsApi } from '@/api/endpoints/reports.api';
import type { DateRange, StaffReport as StaffReportType } from '@/types/report.types';
import type { DateRange as DateRangeValue } from '@/components/shared/date-range-picker';

interface StaffReportProps {
    outletId: string;
    dateRange: DateRange;
    customDateRange?: DateRangeValue;
}

export function StaffReport({ outletId, dateRange, customDateRange }: StaffReportProps) {
    const { data: reportData, isLoading } = useQuery<StaffReportType>({
        queryKey: ['report', 'staff', outletId, dateRange, customDateRange],
        queryFn: () => reportsApi.staff({
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
                Tidak ada data staff untuk periode ini
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(reportData.totalStaff)}</div>
                        <p className="text-xs text-muted-foreground">Karyawan aktif</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Layanan</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(reportData.totalServices)}</div>
                        <p className="text-xs text-muted-foreground">Layanan selesai</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Rating Rata-rata</CardTitle>
                        <Star className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-1">
                            <span className="text-2xl font-bold">{reportData.avgRating.toFixed(1)}</span>
                            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                        </div>
                        <p className="text-xs text-muted-foreground">Dari pelanggan</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Waktu Layanan</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reportData.avgServiceTime} min</div>
                        <p className="text-xs text-muted-foreground">Rata-rata</p>
                    </CardContent>
                </Card>
            </div>

            {/* Staff Leaderboard */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Trophy className="h-4 w-4" />
                        Performa Staff
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {reportData.staffPerformance.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Belum ada data performa</p>
                    ) : (
                        <div className="space-y-4">
                            {reportData.staffPerformance.map((staff, i) => {
                                const initials = staff.name.split(' ').map((n) => n[0]).join('').slice(0, 2);
                                return (
                                    <div key={staff.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                                        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                i === 1 ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                                                    i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                        'bg-muted text-muted-foreground'
                                            }`}>
                                            {i + 1}
                                        </span>
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback>{initials}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{staff.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-muted-foreground">{staff.services} layanan</span>
                                                <span className="text-xs text-muted-foreground">•</span>
                                                <div className="flex items-center gap-0.5">
                                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                                    <span className="text-xs text-muted-foreground">{staff.rating.toFixed(1)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-sm">{formatRupiah(staff.revenue)}</p>
                                            <p className="text-xs text-green-600 dark:text-green-400">
                                                +{formatRupiah(staff.commission)} komisi
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Service Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Breakdown Layanan</CardTitle>
                </CardHeader>
                <CardContent>
                    {reportData.serviceBreakdown.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Belum ada data layanan</p>
                    ) : (
                        <div className="space-y-3">
                            {reportData.serviceBreakdown.map((service, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium">{service.service}</span>
                                            <span className="text-sm text-muted-foreground">{service.count}x</span>
                                        </div>
                                        <Progress value={(service.count / reportData.totalServices) * 100} className="h-2" />
                                    </div>
                                    <Badge variant="outline" className="ml-3 text-[10px]">
                                        ~{service.avgTime}m
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
