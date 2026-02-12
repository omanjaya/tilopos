import { useQuery } from '@tanstack/react-query';
import { staffPerformanceApi } from '@/api/endpoints/staff-performance.api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { DateRange } from '@/types/report.types';
import {
  Trophy,
  TrendingUp,
  Users,
  DollarSign,
  ShoppingCart,
  Award,
  Star,
  Medal,
} from 'lucide-react';

interface StaffPerformanceSectionProps {
  dateRange: DateRange;
}

export function StaffPerformanceSection({ dateRange }: StaffPerformanceSectionProps) {
  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['staff-performance', 'leaderboard', dateRange],
    queryFn: () => staffPerformanceApi.getLeaderboard({ dateRange }),
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['staff-performance', 'summary', dateRange],
    queryFn: () => staffPerformanceApi.getSummary({ dateRange }),
  });

  const isLoading = leaderboardLoading || summaryLoading;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return null;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500 hover:bg-yellow-600">🥇 #1</Badge>;
    if (rank === 2) return <Badge className="bg-gray-400 hover:bg-gray-500">🥈 #2</Badge>;
    if (rank === 3) return <Badge className="bg-amber-600 hover:bg-amber-700">🥉 #3</Badge>;
    return <Badge variant="outline">#{rank}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-4">
          {/* Total Staff */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Karyawan
              </CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {formatNumber(summary?.totalStaff || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Karyawan aktif</p>
            </CardContent>
          </Card>

          {/* Active Staff (with sales) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Staff Aktif Jual
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {formatNumber(summary?.activeStaffCount || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Punya transaksi periode ini</p>
            </CardContent>
          </Card>

          {/* Total Sales by Staff */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Penjualan
              </CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                {formatCurrency(summary?.totalSales || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Dari semua staff</p>
            </CardContent>
          </Card>

          {/* Avg Sales per Staff */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rata-rata/Staff
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-violet-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-violet-600">
                {formatCurrency(summary?.avgSalesPerStaff || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Per staff aktif</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Performer Highlight */}
      {!leaderboardLoading && leaderboard?.topPerformer && (
        <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500 text-white">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg">🏆 Top Performer</CardTitle>
                <CardDescription>Staff terbaik periode ini</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nama</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {leaderboard.topPerformer.employeeName}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {leaderboard.topPerformer.role} • {leaderboard.topPerformer.outletName}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Penjualan</p>
                <p className="text-3xl font-bold text-emerald-700">
                  {formatCurrency(leaderboard.topPerformer.totalSales)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatNumber(leaderboard.topPerformer.transactionCount)} transaksi
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rata-rata Transaksi</p>
                <p className="text-3xl font-bold text-blue-700">
                  {formatCurrency(leaderboard.topPerformer.avgTransactionValue)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Per transaksi</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4" />
            Sales Leaderboard
          </CardTitle>
          <CardDescription>Ranking karyawan berdasarkan penjualan</CardDescription>
        </CardHeader>
        <CardContent>
          {leaderboardLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : leaderboard && leaderboard.leaderboard.length > 0 ? (
            <div className="space-y-3">
              {leaderboard.leaderboard.map((staff) => (
                <div
                  key={staff.employeeId}
                  className={`p-4 rounded-lg border transition-colors ${
                    staff.rank === 1
                      ? 'bg-yellow-50 border-yellow-300'
                      : staff.rank === 2
                      ? 'bg-gray-50 border-gray-300'
                      : staff.rank === 3
                      ? 'bg-amber-50 border-amber-300'
                      : 'bg-white hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Rank */}
                      <div className="flex items-center justify-center w-12 h-12">
                        {getRankIcon(staff.rank) || (
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                            {staff.rank}
                          </div>
                        )}
                      </div>

                      {/* Staff Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-lg">{staff.employeeName}</p>
                          {getRankBadge(staff.rank)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {staff.role} • {staff.outletName}
                        </p>
                      </div>
                    </div>

                    {/* Sales Stats */}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600">
                        {formatCurrency(staff.totalSales)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatNumber(staff.transactionCount)} trx •{' '}
                        {formatCurrency(staff.avgTransactionValue)} avg
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Belum ada data penjualan staff periode ini</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
