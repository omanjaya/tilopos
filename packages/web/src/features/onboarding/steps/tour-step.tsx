import { motion } from 'framer-motion';
import { Layout, ShoppingCart, Package, BarChart3, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TourStepProps {
  onNext: () => void;
  onBack: () => void;
}

const features = [
  {
    icon: Layout,
    title: 'Dashboard',
    description: 'Pantau metrik bisnis penting dalam satu layar. Penjualan hari ini, item terlaris, dan performa karyawan.',
    color: 'bg-blue-500',
  },
  {
    icon: ShoppingCart,
    title: 'POS Terminal',
    description: 'Proses transaksi dengan cepat. Mendukung split bill, berbagai metode pembayaran, dan integrasi printer thermal.',
    color: 'bg-green-500',
  },
  {
    icon: Package,
    title: 'Manajemen Produk',
    description: 'Kelola produk, varian, modifier, dan kategori. Pantau stok dan dapatkan notifikasi stok rendah.',
    color: 'bg-orange-500',
  },
  {
    icon: BarChart3,
    title: 'Laporan & Analisis',
    description: 'Laporan penjualan, laporan inventaris, dan analisis performa bisnis. Export ke Excel/PDF.',
    color: 'bg-purple-500',
  },
  {
    icon: Settings,
    title: 'Pengaturan',
    description: 'Konfigurasi outlet, karyawan, pajak, template struk, dan banyak lagi sesuai kebutuhan bisnis.',
    color: 'bg-gray-500',
  },
];

export function TourStep({ onNext, onBack }: TourStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="py-8"
    >
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold">Fitur Utama TILO</h2>
        <p className="mt-2 text-muted-foreground">
          Kenali fitur-fitur utama yang akan membantu bisnis Anda
        </p>
      </div>

      {/* Features Grid */}
      <div className="mx-auto max-w-3xl">
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="rounded-lg border p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${feature.color}`}>
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional Features */}
        <div className="mt-6 rounded-lg border border-dashed p-4">
          <p className="mb-2 text-center text-sm font-medium text-muted-foreground">
            Dan masih banyak lagi...
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            {['Kitchen Display', 'Self-Order QR', 'Online Store', 'Integrasi GoFood/GrabFood', 'Program Loyalty', 'Multi-Outlet'].map((item) => (
              <span
                key={item}
                className="rounded-full bg-muted px-2 py-1 text-muted-foreground"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1"
          >
            Kembali
          </Button>
          <Button onClick={onNext} className="flex-1">
            Mulai Gunakan TILO
          </Button>
        </div>

        {/* Tips */}
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <p className="text-center text-sm text-amber-900 dark:text-amber-100">
            <span className="font-medium">Tips:</span> Kapan saja Anda bisa mengakses
            tutorial dengan menekan <kbd className="mx-1 rounded border border-amber-900/20 bg-amber-900/10 px-1.5 py-0.5 font-mono text-xs">⌘K</kbd>
            dan memilih "View Tutorials"
          </p>
        </div>
      </div>
    </motion.div>
  );
}
