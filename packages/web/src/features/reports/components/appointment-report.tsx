import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatRupiah, formatNumber } from '@/lib/format';
import { Calendar, CheckCircle, XCircle, TrendingUp, Users } from 'lucide-react';
import { reportsApi } from '@/api/endpoints/reports.api';
import type { DateRange, AppointmentReport as AppointmentReportType } from '@/types/report.types';
import type { DateRange as DateRangeValue } from '@/components/shared/date-range-picker';

interface AppointmentReportProps {
    outletId: string;
    dateRange: DateRange;
    customDateRange?: DateRangeValue;
}

export function AppointmentReport({ outletId, dateRange, customDateRange }: AppointmentReportProps) {
    const { data: reportData, isLoading } = useQuery<AppointmentReportType>({
        queryKey: ['report', 'appointment', outletId, dateRange, customDateRange],
        queryFn: () => reportsApi.appointment({
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
                Tidak ada data reservasi untuk periode ini
            </div>
        );
    }

    const completionRate = reportData.totalBookings > 0
        ? (reportData.completedBookings / reportData.totalBookings) * 100
        : 0;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Booking</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(reportData.totalBookings)}</div>
                        <p className="text-xs text-muted-foreground">Reservasi diterima</p>
                    </CardContent>
                </Card>

                <Card className="border-green-200 dark:border-green-800/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">
                            Selesai
                        </CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                            {formatNumber(reportData.completedBookings)}
                        </div>
                        <Progress value={completionRate} className="mt-2 h-2" />
                    </CardContent>
                </Card>

                <Card className="border-red-200 dark:border-red-800/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">
                            Batal / No Show
                        </CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                            {formatNumber(reportData.cancelledBookings + reportData.noShowBookings)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {reportData.cancelledBookings} batal, {reportData.noShowBookings} no show
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Rata-rata Nilai</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatRupiah(reportData.avgBookingValue)}</div>
                        <p className="text-xs text-muted-foreground">Per booking</p>
                    </CardContent>
                </Card>
            </div>

            {/* Bookings by Day & Source */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Calendar className="h-4 w-4" />
                            Booking per Hari
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {reportData.bookingsByDay.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Belum ada data</p>
                        ) : (
                            <div className="space-y-3">
                                {reportData.bookingsByDay.map((day) => {
                                    const maxCount = Math.max(...reportData.bookingsByDay.map((d) => d.count));
                                    return (
                                        <div key={day.day} className="flex items-center justify-between">
                                            <span className="text-sm font-medium w-16">{day.day}</span>
                                            <div className="flex-1 mx-3">
                                                <Progress value={maxCount > 0 ? (day.count / maxCount) * 100 : 0} className="h-2" />
                                            </div>
                                            <span className="text-sm text-muted-foreground w-8 text-right">
                                                {day.count}
                                            </span>
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
                            <Users className="h-4 w-4" />
                            Sumber Booking
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {reportData.bookingsBySource.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Belum ada data</p>
                        ) : (
                            <div className="space-y-3">
                                {reportData.bookingsBySource.map((source) => (
                                    <div key={source.source} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                        <span className="text-sm font-medium">{source.source}</span>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">{source.count}</Badge>
                                            <span className="text-sm text-muted-foreground w-12 text-right">
                                                {source.percentage}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Popular Services */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="h-4 w-4" />
                        Layanan Populer
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {reportData.popularServices.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Belum ada data layanan</p>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            {reportData.popularServices.map((service, i) => (
                                <div key={i} className="p-4 rounded-lg bg-muted/50 text-center">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary mx-auto mb-2">
                                        {i + 1}
                                    </span>
                                    <p className="font-medium text-sm">{service.name}</p>
                                    <p className="text-2xl font-bold text-primary mt-1">{service.bookings}</p>
                                    <p className="text-xs text-muted-foreground">bookings</p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
