import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/endpoints/auth.api';
import { subscriptionApi } from '@/api/endpoints/subscription.api';
import { useAuthStore } from '@/stores/auth.store';
import { hasRole } from '@/config/permissions';
import { handleMutationError } from '@/lib/api-error-handler';
import { PageHeader } from '@/components/shared/page-header';
import { ErrorState } from '@/components/shared/error-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Shield,
  Activity,
  Loader2,
  CheckCircle,
  Clock,
  MapPin,
  AlertCircle,
  Crown,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  owner: 'Pemilik',
  manager: 'Manajer',
  supervisor: 'Supervisor',
  cashier: 'Kasir',
  kitchen: 'Dapur',
  inventory: 'Inventori',
};

export function MyProfilePage() {
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  // GET /subscription is @Roles(OWNER, MANAGER)
  const canSeeBilling = hasRole(authUser?.role, 'MANAGEMENT');
  const queryClient = useQueryClient();
  const {
    data: user,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.getMe(),
  });

  const [activeTab, setActiveTab] = useState('personal');
  const [profileData, setProfileData] = useState({ name: '', phone: '' });

  // Initialise the form once the profile has loaded (not from the first, empty render)
  useEffect(() => {
    if (user) {
      setProfileData({ name: user.name ?? '', phone: user.phone ?? '' });
    }
  }, [user]);

  // PIN change state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const updateProfileMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success('Profil berhasil diperbarui');
    },
    onError: (err) => handleMutationError(err, 'Gagal memperbarui profil'),
  });

  const changePinMutation = useMutation({
    mutationFn: authApi.changePin,
    onSuccess: () => {
      toast.success('PIN berhasil diubah');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    },
    onError: (err) => handleMutationError(err, 'Gagal mengubah PIN'),
  });

  const {
    data: activityLogData,
    isLoading: isLoadingActivity,
    isError: isActivityError,
    error: activityError,
    refetch: refetchActivity,
  } = useQuery({
    queryKey: ['auth', 'activity'],
    queryFn: () => authApi.getActivityLog({ page: 1, limit: 20 }),
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.get,
    enabled: canSeeBilling,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const handleProfileSubmit = () => {
    const name = profileData.name.trim();
    if (!name) {
      toast.error('Nama tidak boleh kosong');
      return;
    }
    const phone = profileData.phone.trim();
    updateProfileMutation.mutate({
      name,
      // UpdateProfileDto.phone is @IsPhoneNumber('ID'); an empty string is rejected
      phone: phone || undefined,
    });
  };

  const handlePinSubmit = () => {
    if (newPin !== confirmPin) {
      toast.error('PIN baru dan konfirmasi tidak sama');
      return;
    }
    if (currentPin.length < 4) {
      toast.error('PIN saat ini minimal 4 digit');
      return;
    }
    if (newPin.length !== 6) {
      toast.error('PIN harus 6 digit');
      return;
    }
    changePinMutation.mutate({ currentPin, newPin });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profil Saya" description="Kelola akun Anda" />
        <ErrorState title="Gagal memuat profil" error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  const roleLabel = user?.role ? (ROLE_LABELS[user.role] ?? user.role) : '-';

  return (
    <div className="space-y-6">
      <PageHeader title="Profil Saya" description="Kelola akun dan keamanan Anda" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">
            <User className="mr-2 h-4 w-4" />
            Data Diri
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Keamanan
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="mr-2 h-4 w-4" />
            Aktivitas
          </TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Pribadi</CardTitle>
              <CardDescription>Perbarui nama dan nomor telepon Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Badge variant="secondary" className="mt-2">
                    {roleLabel}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Lengkap</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={user?.email || ''} disabled />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Nomor Telepon</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="08xx-xxxx-xxxx"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleProfileSubmit} disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Perubahan'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informasi Pekerjaan</CardTitle>
              <CardDescription>Peran dan outlet Anda (diatur oleh pemilik/manajer)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Peran</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <Badge>{roleLabel}</Badge>
                  </div>
                </div>
                <div>
                  <Label>Outlet</Label>
                  <p className="mt-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {user?.outletName || 'Belum ditentukan'}
                  </p>
                </div>
                <div>
                  <Label>Bergabung Sejak</Label>
                  <p className="mt-1 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          timeZone: 'Asia/Jakarta',
                        })
                      : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Info (owner/manager only) */}
          {canSeeBilling && subscription && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {subscription.plan === 'premium' ? (
                    <Crown className="h-5 w-5 text-primary" />
                  ) : (
                    <Sparkles className="h-5 w-5 text-muted-foreground" />
                  )}
                  Langganan
                </CardTitle>
                <CardDescription>Informasi paket langganan bisnis kamu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Paket</Label>
                    <div className="mt-1">
                      <Badge variant={subscription.plan === 'premium' ? 'default' : 'secondary'}>
                        {subscription.planConfig.name}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="mt-1">
                      <Badge
                        variant={
                          subscription.status === 'active'
                            ? 'default'
                            : subscription.status === 'trial'
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {subscription.status === 'active'
                          ? 'Aktif'
                          : subscription.status === 'trial'
                            ? 'Trial'
                            : subscription.status === 'expired'
                              ? 'Kedaluwarsa'
                              : 'Dibatalkan'}
                      </Badge>
                    </div>
                  </div>
                </div>
                {subscription.isTrialActive && subscription.daysRemaining !== null && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
                    <p className="text-sm text-amber-900 dark:text-amber-100">
                      <Clock className="mr-1 inline h-4 w-4" />
                      Trial berakhir dalam {subscription.daysRemaining} hari
                    </p>
                  </div>
                )}
                {subscription.endDate && (
                  <div>
                    <Label>Berlaku Sampai</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(subscription.endDate).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
                <Button variant="outline" onClick={() => navigate('/app/subscription')}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Kelola Langganan
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ubah PIN</CardTitle>
              <CardDescription>Perbarui PIN 6 digit untuk masuk ke POS</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-pin">PIN Saat Ini</Label>
                <Input
                  id="current-pin"
                  type="password"
                  maxLength={8}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="••••••"
                  className="text-center tracking-widest"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-pin">PIN Baru</Label>
                  <Input
                    id="new-pin"
                    type="password"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="text-center tracking-widest"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-pin">Konfirmasi PIN Baru</Label>
                  <Input
                    id="confirm-pin"
                    type="password"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="text-center tracking-widest"
                  />
                </div>
              </div>
              {newPin && confirmPin && newPin !== confirmPin && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>PIN tidak sama</span>
                </div>
              )}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  <Shield className="mr-1 inline h-4 w-4" />
                  Pastikan Anda mengingat PIN ini. PIN dibutuhkan untuk masuk ke terminal POS.
                </p>
              </div>
              <Button
                onClick={handlePinSubmit}
                disabled={changePinMutation.isPending || !currentPin || !newPin || !confirmPin}
              >
                {changePinMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memperbarui...
                  </>
                ) : (
                  'Perbarui PIN'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Aktivitas Login Terakhir</CardTitle>
              <CardDescription>20 aktivitas login terakhir Anda</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingActivity ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : isActivityError ? (
                <ErrorState
                  title="Gagal memuat aktivitas"
                  error={activityError}
                  onRetry={() => void refetchActivity()}
                />
              ) : activityLogData?.activities && activityLogData.activities.length > 0 ? (
                <div className="space-y-4">
                  {activityLogData.activities.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 rounded-lg border p-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{log.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.ipAddress || 'IP tidak diketahui'} •{' '}
                          {log.userAgent?.split(' ')[0] || 'Perangkat tidak diketahui'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(log.createdAt).toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Belum ada aktivitas login
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
