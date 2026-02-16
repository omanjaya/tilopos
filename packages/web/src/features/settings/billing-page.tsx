import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionApi } from '@/api/endpoints/subscription.api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/lib/toast-utils';
import { formatCurrency } from '@/lib/format';
import {
  Crown, Check, Zap, CreditCard, Clock, Receipt,
  AlertTriangle, Loader2, Calendar,
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

export function BillingPage() {
  const queryClient = useQueryClient();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.get,
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['subscription-invoices'],
    queryFn: subscriptionApi.invoices,
  });

  const upgradeMutation = useMutation({
    mutationFn: subscriptionApi.upgrade,
    onSuccess: (result) => {
      if (result.paymentUrl) {
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
        <PageHeader title="Langganan & Billing" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const isPremium = subscription?.plan === 'premium';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trial';
  const monthlyPrice = 149000;
  const yearlyPrice = 1190000;

  return (
    <div className="space-y-6">
      <PageHeader title="Langganan & Billing" />

      {/* Current Plan */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Paket Saat Ini</CardTitle>
            <PlanBadge plan={subscription?.plan ?? 'free'} status={subscription?.status ?? 'active'} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            {isPremium ? (
              <Crown className="h-8 w-8 text-amber-500" />
            ) : (
              <CreditCard className="h-8 w-8 text-muted-foreground" />
            )}
            <div>
              <p className="font-semibold text-lg">{isPremium ? 'Premium' : 'Free'}</p>
              <p className="text-sm text-muted-foreground">
                {isPremium
                  ? subscription?.planConfig.description
                  : 'Fitur dasar POS untuk memulai bisnis'}
              </p>
            </div>
          </div>

          {subscription?.isTrialActive && subscription.trialEndsAt && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Trial Premium — {subscription.daysRemaining !== null ? `${subscription.daysRemaining} hari tersisa` : 'aktif'}
                </p>
              </div>
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                Berakhir {new Date(subscription.trialEndsAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.
                Upgrade sebelum trial habis agar tidak kehilangan akses fitur Premium.
              </p>
            </div>
          )}

          {isPremium && subscription?.endDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {subscription.status === 'cancelled' ? 'Aktif sampai' : 'Perpanjangan'}: {' '}
                {new Date(subscription.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                {subscription.daysRemaining !== null && ` (${subscription.daysRemaining} hari lagi)`}
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {!isPremium && (
              <Button onClick={() => setUpgradeOpen(true)}>
                <Zap className="mr-1.5 h-4 w-4" />
                Upgrade ke Premium
              </Button>
            )}
            {isPremium && isActive && subscription?.status !== 'cancelled' && (
              <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)}>
                Batalkan Langganan
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Perbandingan Paket</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Free Plan */}
            <div className={`rounded-lg border p-4 ${!isPremium ? 'border-primary ring-1 ring-primary' : ''}`}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Free</h3>
                {!isPremium && <Badge variant="outline">Paket Anda</Badge>}
              </div>
              <p className="mb-4 text-2xl font-bold">Rp 0 <span className="text-sm font-normal text-muted-foreground">/selamanya</span></p>
              <div className="space-y-2">
                {FREE_FEATURES.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Plan */}
            <div className={`rounded-lg border p-4 ${isPremium ? 'border-amber-500 ring-1 ring-amber-500' : 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30'}`}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 font-semibold">
                  <Crown className="h-4 w-4 text-amber-500" /> Premium
                </h3>
                {isPremium && <Badge className="bg-amber-500 text-white">Paket Anda</Badge>}
              </div>
              <p className="mb-1 text-2xl font-bold">{formatCurrency(monthlyPrice)} <span className="text-sm font-normal text-muted-foreground">/bulan</span></p>
              <p className="mb-4 text-xs text-muted-foreground">atau {formatCurrency(yearlyPrice)}/tahun (hemat 33%)</p>

              <div className="mb-3 text-xs font-medium text-muted-foreground">Semua fitur Free, ditambah:</div>
              <div className="space-y-2">
                {PREMIUM_FEATURES.map((f) => (
                  <div key={f.name} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <div>
                      <span className="font-medium">{f.name}</span>
                      <span className="text-muted-foreground"> — {f.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              {!isPremium && (
                <Button className="mt-4 w-full" onClick={() => setUpgradeOpen(true)}>
                  <Zap className="mr-1.5 h-4 w-4" />
                  Upgrade Sekarang
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
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
          ) : !invoices?.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Belum ada invoice</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <InvoiceRow key={inv.id} invoice={inv} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Upgrade ke Premium
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <RadioGroup value={billingCycle} onValueChange={(v) => setBillingCycle(v as 'monthly' | 'yearly')}>
              <div className="space-y-2">
                <Label
                  htmlFor="yearly"
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 ${billingCycle === 'yearly' ? 'border-primary bg-primary/5' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="yearly" id="yearly" />
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
                  htmlFor="monthly"
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 ${billingCycle === 'monthly' ? 'border-primary bg-primary/5' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="monthly" id="monthly" />
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
            >
              {upgradeMutation.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-1.5 h-4 w-4" />
              )}
              Bayar Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Batalkan Langganan?
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Fitur Premium tetap aktif sampai akhir periode langganan Anda.
              Setelah itu, akun akan otomatis beralih ke paket Free.
            </p>

            {subscription?.endDate && (
              <div className="rounded-lg border bg-muted/50 p-2.5">
                <p className="text-sm">
                  Premium aktif sampai: <strong>{new Date(subscription.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
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
            >
              {cancelMutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Ya, Batalkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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

function InvoiceRow({ invoice }: { invoice: SubscriptionInvoice }) {
  const statusConfig = {
    paid: { label: 'Lunas', variant: 'default' as const },
    pending: { label: 'Menunggu', variant: 'outline' as const },
    failed: { label: 'Gagal', variant: 'destructive' as const },
    expired: { label: 'Kadaluarsa', variant: 'secondary' as const },
  };

  const config = statusConfig[invoice.status] ?? statusConfig.pending;

  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{invoice.invoiceNumber}</span>
          <Badge variant={config.variant} className="text-[10px] px-1.5 py-0">{config.label}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(invoice.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          {invoice.provider && ` · ${invoice.provider}`}
        </p>
      </div>
      <span className="text-sm font-semibold">{formatCurrency(invoice.amount)}</span>
    </div>
  );
}
