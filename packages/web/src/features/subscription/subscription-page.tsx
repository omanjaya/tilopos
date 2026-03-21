import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionApi } from '@/api/endpoints/subscription.api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/lib/toast-utils';
import { formatCurrency } from '@/lib/format';
import {
  Crown, Check, Zap, CreditCard, Clock, Receipt,
  AlertTriangle, Loader2, Calendar, Sparkles, Shield, RefreshCw,
} from 'lucide-react';
import type { SubscriptionInvoice } from '@/types/subscription.types';

const PREMIUM_FEATURES = [
  { name: 'Multi Outlet', desc: 'Kelola banyak outlet dari satu dashboard' },
  { name: 'Laporan Lanjutan', desc: 'Custom report builder dan export' },
  { name: 'Self Order QR', desc: 'Pelanggan order sendiri via scan QR' },
  { name: 'Toko Online', desc: 'Integrasi marketplace dan online store' },
  { name: 'Program Loyalty', desc: 'Poin dan reward untuk pelanggan' },
  { name: 'Promosi & Voucher', desc: 'Diskon, voucher, dan happy hour' },
  { name: 'Segmentasi Pelanggan', desc: 'Grouping customer untuk targeting' },
  { name: 'Integrasi API', desc: 'Integrasi marketplace dan accounting' },
  { name: 'Audit Log', desc: 'Tracking semua aktivitas sistem' },
  { name: 'Import Excel', desc: 'Import data dari file Excel' },
  { name: 'Multi Gudang', desc: 'Stok di beberapa lokasi gudang' },
];

const FREE_FEATURES = [
  'POS & Transaksi Unlimited',
  'Produk Unlimited',
  '1 Outlet',
  'Laporan Dasar',
  'Manajemen Stok',
  'Manajemen Pelanggan',
];

export function SubscriptionPage() {
  const queryClient = useQueryClient();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [pricingToggle, setPricingToggle] = useState<'monthly' | 'yearly'>('yearly');

  const { data: subscription, isLoading, isError, refetch } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.get,
    staleTime: 5 * 60 * 1000,
  });

  const { data: invoices, isLoading: invoicesLoading, isError: invoicesError, refetch: refetchInvoices } = useQuery({
    queryKey: ['subscription-invoices'],
    queryFn: subscriptionApi.invoices,
    staleTime: 5 * 60 * 1000,
  });

  const upgradeMutation = useMutation({
    mutationFn: subscriptionApi.upgrade,
    onSuccess: (result) => {
      if (result.paymentUrl) {
        try {
          const url = new URL(result.paymentUrl);
          const allowedHosts = ['app.midtrans.com', 'payment.midtrans.com', 'app.xendit.co', 'checkout.xendit.co', 'app.sandbox.midtrans.com', 'checkout-staging.xendit.co'];
          if (!allowedHosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))) {
            toast.error({ title: 'URL pembayaran tidak valid' });
            return;
          }
        } catch {
          toast.error({ title: 'URL pembayaran tidak valid' });
          return;
        }
        window.open(result.paymentUrl, '_blank');
        toast.success({ title: 'Invoice dibuat!', description: 'Silakan selesaikan pembayaran.' });
      } else {
        toast.info({ title: 'Invoice dibuat', description: `${result.invoiceNumber} — menunggu pembayaran.` });
      }
      setUpgradeOpen(false);
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-invoices'] });
    },
    onError: () => {
      toast.error({ title: 'Gagal membuat invoice', description: 'Silakan coba lagi.' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => subscriptionApi.cancel(),
    onSuccess: (result) => {
      toast.success({ title: 'Langganan dibatalkan', description: result.message });
      setCancelOpen(false);
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
    onError: () => {
      toast.error({ title: 'Gagal membatalkan langganan' });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Langganan" description="Kelola paket langganan dan billing Anda" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-56 lg:col-span-2" />
          <Skeleton className="h-56" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Langganan" description="Kelola paket langganan dan billing Anda" />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="mb-3 h-10 w-10 text-destructive/60" />
            <p className="font-medium">Gagal memuat data langganan</p>
            <p className="mt-1 text-sm text-muted-foreground">Terjadi kesalahan saat mengambil data. Silakan coba lagi.</p>
            <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" />
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPremium = subscription?.plan === 'premium';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trial';
  const monthlyPrice = subscription?.planConfig.monthlyPrice ?? 149000;
  const yearlyPrice = subscription?.planConfig.yearlyPrice ?? 1190000;

  const formatDateID = (date: string) =>
    new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <PageHeader title="Langganan" description="Kelola paket langganan dan billing Anda" />

      {/* ── Top Row: Plan Status + Usage Info ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Current Plan Status */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                {isPremium ? <Crown className="h-5 w-5 text-amber-500" /> : <Shield className="h-5 w-5 text-muted-foreground" />}
                Paket Saat Ini
              </CardTitle>
              <PlanBadge plan={subscription?.plan ?? 'free'} status={subscription?.status ?? 'active'} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${isPremium ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-muted'}`}>
                {isPremium ? (
                  <Crown className="h-7 w-7 text-white" />
                ) : (
                  <CreditCard className="h-7 w-7 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-xl font-bold">{isPremium ? 'Premium' : 'Free'}</p>
                <p className="text-sm text-muted-foreground">
                  {isPremium
                    ? subscription?.planConfig.description
                    : 'Fitur dasar POS untuk memulai bisnis'}
                </p>
              </div>
            </div>

            {/* Trial Warning */}
            {subscription?.isTrialActive && subscription.trialEndsAt && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Trial Premium — {subscription.daysRemaining !== null ? `${subscription.daysRemaining} hari tersisa` : 'aktif'}
                  </p>
                </div>
                <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                  Berakhir {formatDateID(subscription.trialEndsAt)}.
                  Upgrade sebelum trial habis agar tidak kehilangan akses fitur Premium.
                </p>
              </div>
            )}

            {/* Expired Warning */}
            {subscription?.status === 'expired' && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">
                    Langganan Premium Anda telah berakhir
                  </p>
                </div>
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  Akun Anda telah beralih ke paket Free. Upgrade kembali untuk mengakses semua fitur Premium.
                </p>
              </div>
            )}

            {/* Renewal / Cancellation Info */}
            {isPremium && subscription?.endDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {subscription.status === 'cancelled' ? 'Aktif sampai' : 'Perpanjangan'}:{' '}
                  {formatDateID(subscription.endDate)}
                  {subscription.daysRemaining !== null && ` (${subscription.daysRemaining} hari lagi)`}
                </span>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex gap-2 pt-1">
              {!isPremium && (
                <Button onClick={() => setUpgradeOpen(true)} className="gap-1.5">
                  <Zap className="h-4 w-4" />
                  Upgrade ke Premium
                </Button>
              )}
              {isPremium && subscription?.isTrialActive && (
                <Button onClick={() => setUpgradeOpen(true)} className="gap-1.5">
                  <Zap className="h-4 w-4" />
                  Bayar Sekarang
                </Button>
              )}
              {isPremium && isActive && subscription?.status !== 'cancelled' && !subscription?.isTrialActive && (
                <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)}>
                  Batalkan Langganan
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage / Subscription Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Info Langganan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Paket" value={isPremium ? 'Premium' : 'Free'} />
            <InfoRow label="Status" value={<StatusText status={subscription?.status ?? 'active'} />} />
            {subscription?.billingCycle && (
              <InfoRow label="Siklus" value={subscription.billingCycle === 'monthly' ? 'Bulanan' : 'Tahunan'} />
            )}
            {subscription?.startDate && (
              <InfoRow label="Mulai" value={formatDateID(subscription.startDate)} />
            )}
            {subscription?.endDate && (
              <InfoRow label="Berakhir" value={formatDateID(subscription.endDate)} />
            )}
            {subscription?.cancelledAt && (
              <InfoRow label="Dibatalkan" value={formatDateID(subscription.cancelledAt)} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Pricing Plan Comparison ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Perbandingan Paket
            </CardTitle>
            <div className="inline-flex items-center rounded-lg border bg-muted p-0.5 text-sm">
              <button
                type="button"
                className={`rounded-md px-3 py-1 font-medium transition-colors ${pricingToggle === 'monthly' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setPricingToggle('monthly')}
              >
                Bulanan
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1 font-medium transition-colors ${pricingToggle === 'yearly' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setPricingToggle('yearly')}
              >
                Tahunan
                <Badge variant="secondary" className="ml-1.5 bg-emerald-100 text-emerald-700 text-[10px] px-1 py-0 dark:bg-emerald-900 dark:text-emerald-300">
                  -33%
                </Badge>
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Free Plan */}
            <div className={`rounded-xl border-2 p-5 transition-colors ${!isPremium ? 'border-primary bg-primary/5' : 'border-transparent hover:border-muted-foreground/20'}`}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Free</h3>
                  <p className="text-xs text-muted-foreground">Untuk memulai bisnis</p>
                </div>
                {!isPremium && <Badge variant="outline" className="border-primary text-primary">Paket Anda</Badge>}
              </div>
              <p className="mb-5 text-3xl font-bold">
                Rp 0 <span className="text-sm font-normal text-muted-foreground">/selamanya</span>
              </p>
              <div className="space-y-2.5">
                {FREE_FEATURES.map((f) => (
                  <div key={f} className="flex items-center gap-2.5 text-sm">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                      <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Plan */}
            <div className={`relative rounded-xl border-2 p-5 transition-colors ${isPremium ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30' : 'border-amber-200 bg-gradient-to-b from-amber-50/80 to-transparent dark:border-amber-900 dark:from-amber-950/40'}`}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-1.5 text-lg font-bold">
                    <Crown className="h-5 w-5 text-amber-500" /> Premium
                  </h3>
                  <p className="text-xs text-muted-foreground">Fitur lengkap untuk scale up</p>
                </div>
                {isPremium && <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">Paket Anda</Badge>}
              </div>
              <p className="mb-1 text-3xl font-bold">
                {formatCurrency(pricingToggle === 'yearly' ? Math.round(yearlyPrice / 12) : monthlyPrice)}
                <span className="text-sm font-normal text-muted-foreground"> /bulan</span>
              </p>
              {pricingToggle === 'yearly' ? (
                <p className="mb-5 text-xs text-muted-foreground">
                  Ditagih {formatCurrency(yearlyPrice)}/tahun (hemat 33%)
                </p>
              ) : (
                <p className="mb-5 text-xs text-muted-foreground">
                  Ditagih {formatCurrency(monthlyPrice)}/bulan
                </p>
              )}

              <div className="mb-3 text-xs font-medium text-muted-foreground">Semua fitur Free, ditambah:</div>
              <div className="space-y-2.5">
                {PREMIUM_FEATURES.map((f) => (
                  <div key={f.name} className="flex items-start gap-2.5 text-sm">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                      <Check className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <span className="font-medium">{f.name}</span>
                      <span className="text-muted-foreground"> — {f.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              {!isPremium && (
                <Button className="mt-5 w-full gap-1.5" onClick={() => { setBillingCycle(pricingToggle); setUpgradeOpen(true); }}>
                  <Zap className="h-4 w-4" />
                  Upgrade Sekarang
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Invoice History ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4" />
            Riwayat Invoice
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : invoicesError ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <AlertTriangle className="mb-2 h-10 w-10 text-destructive/40" />
              <p className="text-sm font-medium text-muted-foreground">Gagal memuat riwayat invoice</p>
              <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => refetchInvoices()}>
                <RefreshCw className="h-3.5 w-3.5" />
                Coba Lagi
              </Button>
            </div>
          ) : !invoices?.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Receipt className="mb-2 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Belum ada invoice</p>
              <p className="text-xs text-muted-foreground/60">Invoice akan muncul setelah Anda melakukan upgrade.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <InvoiceTableRow key={inv.id} invoice={inv} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Upgrade Dialog ── */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Upgrade ke Premium
            </DialogTitle>
            <DialogDescription>Pilih siklus pembayaran untuk paket Premium.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <RadioGroup value={billingCycle} onValueChange={(v) => setBillingCycle(v as 'monthly' | 'yearly')}>
              <div className="space-y-2">
                <Label
                  htmlFor="sub-yearly"
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 ${billingCycle === 'yearly' ? 'border-primary bg-primary/5' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="yearly" id="sub-yearly" />
                    <div>
                      <p className="font-medium">Tahunan</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(yearlyPrice)}/tahun</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                    Hemat 33%
                  </Badge>
                </Label>

                <Label
                  htmlFor="sub-monthly"
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 ${billingCycle === 'monthly' ? 'border-primary bg-primary/5' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="monthly" id="sub-monthly" />
                    <div>
                      <p className="font-medium">Bulanan</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(monthlyPrice)}/bulan</p>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            <Separator />

            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-bold">
                {formatCurrency(billingCycle === 'yearly' ? yearlyPrice : monthlyPrice)}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeOpen(false)}>Batal</Button>
            <Button
              onClick={() => upgradeMutation.mutate({ billingCycle })}
              disabled={upgradeMutation.isPending}
              className="gap-1.5"
            >
              {upgradeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Bayar Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Dialog ── */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Batalkan Langganan?
            </DialogTitle>
            <DialogDescription>Konfirmasi pembatalan langganan Premium Anda.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Fitur Premium tetap aktif sampai akhir periode langganan Anda.
              Setelah itu, akun akan otomatis beralih ke paket Free.
            </p>

            {subscription?.endDate && (
              <div className="rounded-lg border bg-muted/50 p-2.5">
                <p className="text-sm">
                  Premium aktif sampai: <strong>{formatDateID(subscription.endDate)}</strong>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Tetap Berlangganan</Button>
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="gap-1.5"
            >
              {cancelMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Ya, Batalkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Helper Components ── */

function PlanBadge({ plan, status }: { plan: string; status: string }) {
  if (plan === 'premium') {
    if (status === 'trial') {
      return <Badge className="bg-blue-500 text-white">Trial Premium</Badge>;
    }
    if (status === 'cancelled') {
      return <Badge variant="outline" className="border-amber-500 text-amber-600">Premium (Dibatalkan)</Badge>;
    }
    return <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">Premium</Badge>;
  }
  return <Badge variant="secondary">Free</Badge>;
}

function StatusText({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: 'Aktif', className: 'text-emerald-600 dark:text-emerald-400' },
    trial: { label: 'Trial', className: 'text-blue-600 dark:text-blue-400' },
    expired: { label: 'Kedaluwarsa', className: 'text-red-600 dark:text-red-400' },
    cancelled: { label: 'Dibatalkan', className: 'text-amber-600 dark:text-amber-400' },
  };
  const cfg = map[status] ?? { label: status, className: '' };
  return <span className={`font-medium ${cfg.className}`}>{cfg.label}</span>;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function InvoiceTableRow({ invoice }: { invoice: SubscriptionInvoice }) {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'outline' | 'destructive' | 'secondary' }> = {
    paid: { label: 'Lunas', variant: 'default' },
    pending: { label: 'Menunggu', variant: 'outline' },
    failed: { label: 'Gagal', variant: 'destructive' },
    expired: { label: 'Kadaluarsa', variant: 'secondary' },
  };

  const config = statusConfig[invoice.status] ?? { label: 'Menunggu', variant: 'outline' as const };

  return (
    <TableRow>
      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
      <TableCell className="text-muted-foreground">
        {new Date(invoice.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
      </TableCell>
      <TableCell>
        <Badge variant={config.variant} className="text-[10px] px-1.5 py-0">{config.label}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">{invoice.provider ?? '—'}</TableCell>
      <TableCell className="text-right font-semibold">{formatCurrency(invoice.amount)}</TableCell>
    </TableRow>
  );
}
