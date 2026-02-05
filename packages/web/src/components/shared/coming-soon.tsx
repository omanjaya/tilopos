import { Construction, Calendar, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

/**
 * ComingSoon Component
 *
 * Placeholder component for features that have backend support but no UI yet.
 * Displays clear messaging about feature availability and estimated timeline.
 *
 * Used for: Integrations, Payment Config, Waiting List, and other planned features.
 */

interface ComingSoonProps {
  /** Feature title */
  title: string;
  /** Brief description of the feature */
  description: string;
  /** Estimated availability (e.g., "Q2 2026", "Next Month", "In Development") */
  eta?: string;
  /** List of planned capabilities */
  features?: string[];
  /** Show beta signup option */
  showBetaSignup?: boolean;
  /** Custom className */
  className?: string;
}

export function ComingSoon({
  title,
  description,
  eta = 'Segera Hadir',
  features,
  showBetaSignup = false,
  className,
}: ComingSoonProps) {
  return (
    <div className={cn('container mx-auto max-w-3xl py-8', className)}>
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Construction className="h-12 w-12 text-primary" aria-hidden="true" />
          </div>
        </div>
        <h1 className="mb-2 text-3xl font-bold">{title}</h1>
        <p className="text-lg text-muted-foreground">{description}</p>
      </div>

      {/* ETA Badge */}
      <div className="mb-6 flex justify-center">
        <Badge variant="secondary" className="gap-2 px-4 py-2 text-sm">
          <Calendar className="h-4 w-4" aria-hidden="true" />
          {eta}
        </Badge>
      </div>

      {/* Features List */}
      {features && features.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Fitur yang Akan Datang</CardTitle>
            <CardDescription>
              Berikut adalah fitur-fitur yang sedang kami kembangkan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                    {index + 1}
                  </span>
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Fitur Dalam Pengembangan</AlertTitle>
        <AlertDescription>
          Backend untuk fitur ini sudah siap, namun antarmuka pengguna sedang dalam tahap
          pengembangan. Kami akan segera merilis fitur ini dalam waktu dekat.
        </AlertDescription>
      </Alert>

      {/* Beta Signup (Optional) */}
      {showBetaSignup && (
        <Card className="mt-6 border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Tertarik Mencoba Beta?</CardTitle>
            <CardDescription>
              Hubungi tim support untuk mendapatkan akses awal ke fitur ini
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

/**
 * Predefined ComingSoon variants for specific features
 */

export function IntegrationsComingSoon() {
  return (
    <ComingSoon
      title="Integrasi"
      description="Hubungkan TiloPOS dengan aplikasi dan layanan favorit Anda"
      eta="Q2 2026"
      features={[
        'Integrasi dengan platform e-commerce (Tokopedia, Shopee, Lazada)',
        'Sinkronisasi dengan aplikasi akuntansi (Accurate, Jurnal)',
        'Koneksi dengan layanan pengiriman (JNE, J&T, SiCepat)',
        'Integrasi payment gateway (Midtrans, Xendit, DOKU)',
        'Webhook custom untuk automasi bisnis',
      ]}
      showBetaSignup
    />
  );
}

export function PaymentConfigComingSoon() {
  return (
    <ComingSoon
      title="Konfigurasi Pembayaran"
      description="Pengaturan lanjutan untuk metode pembayaran dan integrasi payment gateway"
      eta="Maret 2026"
      features={[
        'Setup payment gateway (Midtrans, Xendit, DOKU)',
        'Konfigurasi virtual account otomatis',
        'Pengaturan cicilan dan BNPL',
        'Customisasi fee dan MDR per metode pembayaran',
        'Laporan rekonsiliasi pembayaran otomatis',
      ]}
    />
  );
}

export function WaitingListComingSoon() {
  return (
    <ComingSoon
      title="Waiting List"
      description="Kelola daftar tunggu pelanggan untuk reservasi dan antrian"
      eta="Februari 2026"
      features={[
        'Daftar tunggu pelanggan dengan estimasi waktu',
        'Notifikasi SMS/WhatsApp saat meja tersedia',
        'Prioritas untuk pelanggan VIP',
        'Statistik waktu tunggu rata-rata',
        'Integrasi dengan sistem reservasi',
      ]}
      showBetaSignup
    />
  );
}
