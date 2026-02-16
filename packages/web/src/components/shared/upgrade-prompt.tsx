import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Check, X, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';

const PREMIUM_FEATURES = [
  'Multi Outlet',
  'Laporan Lanjutan + Export',
  'Self Order QR',
  'Toko Online',
  'Program Loyalty',
  'Promosi & Voucher',
  'Segmentasi Pelanggan',
  'Integrasi API',
  'Audit Log',
  'Import Excel',
  'Multi Gudang',
];

const MONTHLY_PRICE = 149000;
const YEARLY_PRICE = 1190000;

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string;
}

export function UpgradePrompt({ open, onOpenChange, featureName }: UpgradePromptProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Upgrade ke Premium
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {featureName && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>{featureName}</strong> hanya tersedia di paket Premium.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Fitur Premium mencakup:</p>
            <div className="grid grid-cols-1 gap-1.5">
              {PREMIUM_FEATURES.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Bulanan</span>
              <span className="font-semibold">{formatCurrency(MONTHLY_PRICE)}/bulan</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">Tahunan</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Hemat 33%</Badge>
              </div>
              <span className="font-semibold">{formatCurrency(YEARLY_PRICE)}/tahun</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Nanti
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                onOpenChange(false);
                navigate('/app/settings/billing');
              }}
            >
              <Zap className="mr-1.5 h-4 w-4" />
              Lihat Paket
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface UpgradeBannerProps {
  className?: string;
}

export function UpgradeBanner({ className }: UpgradeBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (dismissed) return null;

  return (
    <div className={`relative flex items-center gap-3 rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-3 dark:border-amber-900 dark:from-amber-950/50 dark:to-orange-950/50 ${className}`}>
      <Crown className="h-5 w-5 text-amber-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Upgrade ke Premium</p>
        <p className="text-xs text-muted-foreground">Akses semua fitur untuk mengembangkan bisnis Anda</p>
      </div>
      <Button size="sm" variant="default" onClick={() => navigate('/app/settings/billing')}>
        <Zap className="mr-1 h-3.5 w-3.5" />
        Upgrade
      </Button>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-1 top-1 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ProBadge() {
  return (
    <Badge variant="secondary" className="ml-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] px-1 py-0 leading-tight font-bold">
      PRO
    </Badge>
  );
}
