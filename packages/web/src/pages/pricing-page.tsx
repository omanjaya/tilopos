import { Link } from 'react-router-dom';
import { Check, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { applyTheme, getSavedTheme, type BrandTheme } from '@/config/theme.config';

interface PlanFeature {
  label: string;
  free: boolean | string;
  premium: boolean | string;
}

const features: PlanFeature[] = [
  { label: 'Kasir POS', free: true, premium: true },
  { label: 'Manajemen Produk', free: true, premium: true },
  { label: 'Manajemen Stok', free: true, premium: true },
  { label: 'Laporan Penjualan Dasar', free: true, premium: true },
  { label: 'Kitchen Display (KDS)', free: true, premium: true },
  { label: 'Manajemen Karyawan', free: true, premium: true },
  { label: 'Manajemen Pelanggan', free: true, premium: true },
  { label: 'Jumlah Outlet', free: '1', premium: 'Unlimited' },
  { label: 'Laporan & Analitik Lanjutan', free: false, premium: true },
  { label: 'Toko Online', free: false, premium: true },
  { label: 'Self-Order QR Code', free: false, premium: true },
  { label: 'Program Loyalty', free: false, premium: true },
  { label: 'Promosi & Voucher', free: false, premium: true },
  { label: 'Segmentasi Pelanggan', free: false, premium: true },
  { label: 'Multi Gudang', free: false, premium: true },
  { label: 'Import Excel', free: false, premium: true },
  { label: 'Audit Log', free: false, premium: true },
  { label: 'Integrasi API', free: false, premium: true },
];

function FeatureValue({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="text-sm font-medium" style={{ color: 'var(--brand-heading)' }}>{value}</span>;
  }
  if (value) {
    return <Check className="h-5 w-5 mx-auto" style={{ color: 'var(--brand-primary)' }} />;
  }
  return <X className="h-5 w-5 mx-auto text-gray-300" />;
}

export function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [currentTheme] = useState<BrandTheme>(getSavedTheme());

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const monthlyPrice = 149000;
  const yearlyPrice = 1190000;
  const yearlyMonthly = Math.round(yearlyPrice / 12);
  const savings = Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--brand-bg)' }}>
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[var(--brand-bg)]/90 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))` }}
              >
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className="text-xl font-bold" style={{ color: 'var(--brand-heading)' }}>TiloPOS</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="ghost" size="sm" style={{ color: 'var(--brand-text)' }}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Beranda
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" size="sm" style={{ color: 'var(--brand-text)' }}>
                  Masuk
                </Button>
              </Link>
              <Link to="/register">
                <Button
                  size="sm"
                  className="text-white font-medium px-5"
                  style={{
                    background: `linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))`,
                    borderRadius: 'var(--brand-button-radius)',
                  }}
                >
                  Daftar Gratis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-16 pb-10 px-4 sm:px-6 lg:px-8 text-center">
        <h1
          className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4"
          style={{ color: 'var(--brand-heading)' }}
        >
          Pilih Paket yang Tepat
        </h1>
        <p className="text-lg max-w-xl mx-auto mb-8" style={{ color: 'var(--brand-text)' }}>
          Mulai gratis, upgrade kapan saja sesuai kebutuhan bisnis Anda
        </p>

        {/* Billing Toggle */}
        <div className="inline-flex items-center gap-1 rounded-full p-1 border border-gray-200" style={{ backgroundColor: 'var(--brand-surface)' }}>
          <button
            onClick={() => setBilling('monthly')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              billing === 'monthly' ? 'text-white shadow-sm' : ''
            }`}
            style={billing === 'monthly' ? {
              background: `linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))`,
            } : { color: 'var(--brand-text)' }}
          >
            Bulanan
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              billing === 'yearly' ? 'text-white shadow-sm' : ''
            }`}
            style={billing === 'yearly' ? {
              background: `linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))`,
            } : { color: 'var(--brand-text)' }}
          >
            Tahunan
            <span className="ml-1.5 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
              Hemat {savings}%
            </span>
          </button>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <div
            className="rounded-2xl border-2 border-gray-200 p-8 flex flex-col"
            style={{ backgroundColor: 'var(--brand-card)' }}
          >
            <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--brand-heading)' }}>Free</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--brand-muted)' }}>
              Fitur dasar POS untuk memulai bisnis
            </p>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold" style={{ color: 'var(--brand-heading)' }}>Rp 0</span>
              <span className="text-sm" style={{ color: 'var(--brand-muted)' }}>/selamanya</span>
            </div>
            <Link to="/register" className="mb-8">
              <Button
                className="w-full h-12 font-semibold"
                variant="outline"
                style={{
                  borderColor: 'var(--brand-primary)',
                  color: 'var(--brand-primary)',
                  borderRadius: 'var(--brand-button-radius)',
                }}
              >
                Mulai Gratis
              </Button>
            </Link>
            <ul className="space-y-3 flex-1">
              {features.filter(f => f.free).map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  {typeof f.free === 'string' ? (
                    <span className="w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full bg-gray-100" style={{ color: 'var(--brand-primary)' }}>
                      {f.free}
                    </span>
                  ) : (
                    <Check className="w-5 h-5 shrink-0" style={{ color: 'var(--brand-primary)' }} />
                  )}
                  <span style={{ color: 'var(--brand-text)' }}>{f.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Premium Plan */}
          <div
            className="rounded-2xl border-2 p-8 flex flex-col relative"
            style={{
              backgroundColor: 'var(--brand-card)',
              borderColor: 'var(--brand-primary)',
            }}
          >
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold text-white"
              style={{ background: `linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))` }}
            >
              Rekomendasi
            </div>
            <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--brand-heading)' }}>Premium</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--brand-muted)' }}>
              Semua fitur untuk mengembangkan bisnis
            </p>
            <div className="flex items-baseline gap-1 mb-1">
              <span style={{ color: 'var(--brand-muted)' }}>Rp</span>
              <span className="text-4xl font-bold" style={{ color: 'var(--brand-heading)' }}>
                {(billing === 'monthly' ? monthlyPrice : yearlyMonthly).toLocaleString('id-ID')}
              </span>
              <span className="text-sm" style={{ color: 'var(--brand-muted)' }}>/bulan</span>
            </div>
            {billing === 'yearly' && (
              <p className="text-xs mb-5" style={{ color: 'var(--brand-muted)' }}>
                Ditagih Rp {yearlyPrice.toLocaleString('id-ID')}/tahun
              </p>
            )}
            {billing === 'monthly' && <div className="mb-5" />}
            <Link to="/register" className="mb-8">
              <Button
                className="w-full h-12 font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))`,
                  borderRadius: 'var(--brand-button-radius)',
                }}
              >
                Coba Gratis 14 Hari
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <p className="text-xs text-center mb-6" style={{ color: 'var(--brand-muted)' }}>
              Tanpa kartu kredit. Batal kapan saja.
            </p>
            <ul className="space-y-3 flex-1">
              <li className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--brand-primary)' }}>
                Semua fitur Free, plus:
              </li>
              {features.filter(f => !f.free && f.premium).map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <Check className="w-5 h-5 shrink-0" style={{ color: 'var(--brand-primary)' }} />
                  <span style={{ color: 'var(--brand-text)' }}>{f.label}</span>
                </li>
              ))}
              {features.filter(f => typeof f.premium === 'string').map((f, i) => (
                <li key={`str-${i}`} className="flex items-center gap-3 text-sm">
                  <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full" style={{ backgroundColor: 'var(--brand-surface)', color: 'var(--brand-primary)' }}>
                    ∞
                  </span>
                  <span style={{ color: 'var(--brand-text)' }}>{f.label} — <strong>{f.premium}</strong></span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8" style={{ color: 'var(--brand-heading)' }}>
            Perbandingan Fitur Lengkap
          </h2>
          <div className="rounded-2xl border border-gray-200 overflow-hidden" style={{ backgroundColor: 'var(--brand-card)' }}>
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_120px_120px] border-b border-gray-200 text-center" style={{ backgroundColor: 'var(--brand-surface)' }}>
              <div className="p-4 text-left text-sm font-semibold" style={{ color: 'var(--brand-heading)' }}>Fitur</div>
              <div className="p-4 text-sm font-semibold" style={{ color: 'var(--brand-heading)' }}>Free</div>
              <div className="p-4 text-sm font-semibold" style={{ color: 'var(--brand-primary)' }}>Premium</div>
            </div>
            {/* Table Rows */}
            {features.map((f, i) => (
              <div
                key={i}
                className={`grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_120px_120px] text-center ${
                  i < features.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="p-4 text-left text-sm" style={{ color: 'var(--brand-text)' }}>{f.label}</div>
                <div className="p-4 flex items-center justify-center"><FeatureValue value={f.free} /></div>
                <div className="p-4 flex items-center justify-center"><FeatureValue value={f.premium} /></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-16 px-4 sm:px-6 lg:px-8"
        style={{ background: `linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))` }}
      >
        <div className="max-w-2xl mx-auto text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Siap Mulai?
          </h2>
          <p className="text-lg opacity-90 mb-6">
            Daftar gratis dan upgrade kapan saja.
          </p>
          <Link to="/register">
            <Button
              size="lg"
              className="h-12 px-8 font-semibold text-lg"
              style={{
                backgroundColor: 'white',
                color: 'var(--brand-primary)',
                borderRadius: 'var(--brand-button-radius)',
              }}
            >
              Daftar Gratis
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, var(--brand-gradient-from), var(--brand-gradient-to))` }}
            >
              <span className="text-white font-bold text-xs">T</span>
            </div>
            <span className="font-semibold text-sm" style={{ color: 'var(--brand-heading)' }}>TiloPOS</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--brand-muted)' }}>
            &copy; {new Date().getFullYear()} TiloPOS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
