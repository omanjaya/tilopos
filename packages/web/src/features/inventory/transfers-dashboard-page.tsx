import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '@/api/endpoints/inventory.api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTransferSocket } from '@/hooks/realtime/use-transfer-socket';
import { formatDateTime } from '@/lib/format';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  Truck,
  AlertTriangle,
  TrendingUp,
  ArrowRightLeft,
} from 'lucide-react';

export function TransfersDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Real-time WebSocket updates
  const { isConnected } = useTransferSocket({
    onStatusChange: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['transfer-metrics'] });
    },
    showNotifications: false, // Dashboard doesn't need notifications
  });

  const { data: allTransfers, isLoading } = useQuery({
    queryKey: ['stock-transfers'],
    queryFn: () => inventoryApi.listTransfers(),
  });

  // Calculate metrics
  const metrics = {
    inTransit: allTransfers?.filter((t) => t.status === 'in_transit' || t.status === 'shipped').length || 0,
    pendingApproval: allTransfers?.filter((t) => t.status === 'requested').length || 0,
    completedToday: allTransfers?.filter((t) => {
      if (t.status !== 'received' || !t.receivedAt) return false;
      const today = new Date();
      const receivedDate = new Date(t.receivedAt);
      return receivedDate.toDateString() === today.toDateString();
    }).length || 0,
    totalThisMonth: allTransfers?.filter((t) => {
      const date = new Date(t.createdAt);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length || 0,
  };

  // Get stuck transfers (approved > 24 hours ago but not shipped)
  const stuckTransfers = allTransfers?.filter((t) => {
    if (t.status !== 'approved' || !t.approvedAt) return false;
    const approvedDate = new Date(t.approvedAt);
    const hoursSinceApproved = (Date.now() - approvedDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceApproved > 24;
  }) || [];

  // Get pending approvals
  const pendingTransfers = allTransfers?.filter((t) => t.status === 'requested').slice(0, 5) || [];

  // Get recent in-transit
  const inTransitTransfers = allTransfers
    ?.filter((t) => t.status === 'in_transit' || t.status === 'shipped')
    .slice(0, 5) || [];

  // Calculate most transferred routes
  const routeStats = allTransfers?.reduce(
    (acc, transfer) => {
      const route = `${transfer.sourceOutletName} → ${transfer.destinationOutletName}`;
      acc[route] = (acc[route] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const topRoutes = Object.entries(routeStats || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Transfer Dashboard">
          <Button variant="outline" onClick={() => navigate('/app/inventory/transfers')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
        </PageHeader>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transfer Dashboard"
        description="Monitoring & analytics transfer stok"
      >
        {isConnected && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse" />
            Live
          </Badge>
        )}
        <Button variant="outline" onClick={() => navigate('/app/inventory/transfers')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
      </PageHeader>

      {/* Metrics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Transit
            </CardTitle>
            <Truck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{metrics.inTransit}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sedang dalam perjalanan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approval
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{metrics.pendingApproval}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Menunggu persetujuan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Today
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{metrics.completedToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Transfer selesai hari ini
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{metrics.totalThisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total transfer bulan ini
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {stuckTransfers.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-base text-yellow-900">
                ⚠️ Transfer Terhambat ({stuckTransfers.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-800 mb-3">
              Transfer berikut telah disetujui lebih dari 24 jam namun belum dikirim:
            </p>
            <div className="space-y-2">
              {stuckTransfers.slice(0, 3).map((transfer) => (
                <div
                  key={transfer.id}
                  className="flex items-center justify-between bg-white rounded-lg p-3"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{transfer.transferNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {transfer.sourceOutletName} → {transfer.destinationOutletName}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/app/inventory/transfers/${transfer.id}`)}
                  >
                    Lihat
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pending Approvals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingTransfers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Tidak ada transfer yang menunggu persetujuan
              </p>
            ) : (
              <div className="space-y-3">
                {pendingTransfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div className="flex-1">
                      <button
                        className="font-medium text-sm text-primary hover:underline"
                        onClick={() => navigate(`/app/inventory/transfers/${transfer.id}`)}
                      >
                        {transfer.transferNumber}
                      </button>
                      <p className="text-xs text-muted-foreground">
                        {transfer.sourceOutletName} → {transfer.destinationOutletName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(transfer.createdAt)}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      Diminta
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* In Transit */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" />
              In Transit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inTransitTransfers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Tidak ada transfer dalam perjalanan
              </p>
            ) : (
              <div className="space-y-3">
                {inTransitTransfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div className="flex-1">
                      <button
                        className="font-medium text-sm text-primary hover:underline"
                        onClick={() => navigate(`/app/inventory/transfers/${transfer.id}`)}
                      >
                        {transfer.transferNumber}
                      </button>
                      <p className="text-xs text-muted-foreground">
                        {transfer.sourceOutletName} → {transfer.destinationOutletName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dikirim: {transfer.shippedAt ? formatDateTime(transfer.shippedAt) : '-'}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                      Dikirim
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Routes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Top Transfer Routes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topRoutes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Belum ada data transfer
            </p>
          ) : (
            <div className="space-y-4">
              {topRoutes.map(([route, count], index) => (
                <div key={route} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{route}</p>
                    <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${(count / (topRoutes[0]?.[1] || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-sm font-bold text-muted-foreground">{count}x</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
