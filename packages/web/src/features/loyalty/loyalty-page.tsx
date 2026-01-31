import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionsApi } from '@/api/endpoints/promotions.api';
import { PageHeader } from '@/components/shared/page-header';
import { MetricCard } from '@/components/shared/metric-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDateTime } from '@/lib/format';
import {
  Users,
  UserCheck,
  Coins,
  Gift,
  Trophy,
  ArrowUpCircle,
  ArrowDownCircle,
  Crown,
  Save,
  Loader2,
} from 'lucide-react';

export function LoyaltyPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('analytics');

  // Fetch loyalty program
  const { data: program, isLoading: programLoading } = useQuery({
    queryKey: ['loyalty', 'program'],
    queryFn: promotionsApi.getLoyaltyProgram,
  });

  // Fetch loyalty tiers
  const { data: tiers = [], isLoading: tiersLoading } = useQuery({
    queryKey: ['loyalty', 'tiers'],
    queryFn: promotionsApi.getLoyaltyTiers,
  });

  // Fetch loyalty analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['loyalty', 'analytics'],
    queryFn: promotionsApi.getLoyaltyAnalytics,
  });

  // Program form state
  const [formName, setFormName] = useState('');
  const [formAmountPerPoint, setFormAmountPerPoint] = useState(10000);
  const [formRedemptionRate, setFormRedemptionRate] = useState(100);
  const [formExpiryDays, setFormExpiryDays] = useState(365);
  const [formInitialized, setFormInitialized] = useState(false);

  // Initialize form with program data
  if (program && !formInitialized) {
    setFormName(program.name || '');
    setFormAmountPerPoint(program.amountPerPoint || 10000);
    setFormRedemptionRate(program.redemptionRate || 100);
    setFormExpiryDays(program.pointExpiryDays || 365);
    setFormInitialized(true);
  }

  const createProgram = useMutation({
    mutationFn: promotionsApi.createLoyaltyProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty'] });
      toast({ title: 'Program loyalty berhasil disimpan' });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Gagal menyimpan program' });
    },
  });

  const handleSaveProgram = () => {
    createProgram.mutate({
      name: formName || 'Loyalty Program',
      amountPerPoint: formAmountPerPoint,
      redemptionRate: formRedemptionRate,
      pointExpiryDays: formExpiryDays,
    });
  };

  const isLoading = programLoading || tiersLoading || analyticsLoading;

  return (
    <div>
      <PageHeader title="Loyalty Program" description="Kelola program loyalitas pelanggan" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="analytics">Analitik</TabsTrigger>
          <TabsTrigger value="tiers">Tier</TabsTrigger>
          <TabsTrigger value="settings">Pengaturan</TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <LoyaltyAnalyticsSection
            analytics={analytics ?? null}
            isLoading={isLoading}
          />
        </TabsContent>

        {/* Tiers Tab */}
        <TabsContent value="tiers">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribusi Tier</CardTitle>
            </CardHeader>
            <CardContent>
              {tiersLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : tiers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada tier yang dikonfigurasi.</p>
              ) : (
                <div className="space-y-3">
                  {tiers.map((tier) => {
                    const dist = analytics?.tierDistribution.find((d) => d.tierName === tier.name);
                    return (
                      <div
                        key={tier.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Crown className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{tier.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Min. {tier.minPoints.toLocaleString('id-ID')} poin | {tier.multiplier}x multiplier
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {(dist?.memberCount ?? 0).toLocaleString('id-ID')} member
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pengaturan Program</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-lg">
              {programLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="programName">Nama Program</Label>
                    <Input
                      id="programName"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Loyalty Program"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amountPerPoint">
                      Jumlah Belanja per Poin (Rp)
                    </Label>
                    <Input
                      id="amountPerPoint"
                      type="number"
                      min={1}
                      value={formAmountPerPoint}
                      onChange={(e) => setFormAmountPerPoint(Number(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Pelanggan mendapat 1 poin setiap {formatCurrency(formAmountPerPoint)} belanja
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="redemptionRate">Nilai Tukar Poin (Rp per poin)</Label>
                    <Input
                      id="redemptionRate"
                      type="number"
                      min={1}
                      value={formRedemptionRate}
                      onChange={(e) => setFormRedemptionRate(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiryDays">Masa Berlaku Poin (hari)</Label>
                    <Input
                      id="expiryDays"
                      type="number"
                      min={0}
                      value={formExpiryDays}
                      onChange={(e) => setFormExpiryDays(Number(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">
                      0 = poin tidak pernah kedaluwarsa
                    </p>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleSaveProgram} disabled={createProgram.isPending}>
                      {createProgram.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Simpan
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---- Analytics Sub-section ----

interface LoyaltyAnalyticsSectionProps {
  analytics: import('@/types/promotion.types').LoyaltyAnalytics | null;
  isLoading: boolean;
}

function LoyaltyAnalyticsSection({ analytics, isLoading }: LoyaltyAnalyticsSectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = analytics ?? {
    totalMembers: 0,
    activeMembers: 0,
    totalPointsIssued: 0,
    totalPointsRedeemed: 0,
    redemptionRate: 0,
    topCustomers: [],
    tierDistribution: [],
    recentActivity: [],
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Member"
          value={data.totalMembers.toLocaleString('id-ID')}
          icon={Users}
        />
        <MetricCard
          title="Member Aktif"
          value={data.activeMembers.toLocaleString('id-ID')}
          icon={UserCheck}
        />
        <MetricCard
          title="Poin Diterbitkan"
          value={data.totalPointsIssued.toLocaleString('id-ID')}
          icon={Coins}
        />
        <MetricCard
          title="Poin Ditukarkan"
          value={data.totalPointsRedeemed.toLocaleString('id-ID')}
          icon={Gift}
          description={`Redemption rate: ${data.redemptionRate.toFixed(1)}%`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Customers by Points */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-primary" />
              Top Pelanggan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada data pelanggan.</p>
            ) : (
              <div className="space-y-3">
                {data.topCustomers.map((customer, index) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{customer.name}</p>
                        {customer.tierName && (
                          <Badge variant="outline" className="mt-0.5 text-xs">
                            {customer.tierName}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {customer.totalPoints.toLocaleString('id-ID')} pts
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sisa: {customer.currentPoints.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Crown className="h-5 w-5 text-primary" />
              Distribusi Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.tierDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada tier yang dikonfigurasi.</p>
            ) : (
              <div className="space-y-3">
                {data.tierDistribution.map((tier) => {
                  const percentage =
                    data.totalMembers > 0
                      ? ((tier.memberCount / data.totalMembers) * 100).toFixed(1)
                      : '0';
                  return (
                    <div key={tier.tierName} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{tier.tierName}</span>
                        <span className="text-muted-foreground">
                          {tier.memberCount.toLocaleString('id-ID')} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${data.totalMembers > 0 ? (tier.memberCount / data.totalMembers) * 100 : 0}%`,
                            backgroundColor: tier.color || undefined,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Points Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aktivitas Poin Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada aktivitas poin.</p>
          ) : (
            <div className="space-y-3">
              {data.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    {activity.type === 'earn' ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                        <ArrowUpCircle className="h-4 w-4 text-green-600" />
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10">
                        <ArrowDownCircle className="h-4 w-4 text-orange-600" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{activity.customerName}</p>
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        activity.type === 'earn' ? 'text-green-600' : 'text-orange-600'
                      }`}
                    >
                      {activity.type === 'earn' ? '+' : '-'}
                      {activity.points.toLocaleString('id-ID')} pts
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(activity.occurredAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
