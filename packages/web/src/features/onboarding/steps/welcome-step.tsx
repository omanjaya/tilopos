import { motion } from 'framer-motion';
import { Sparkles, Play, Zap, Package, BarChart3, Heart, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WelcomeStepProps {
  onNext: () => void;
  onSkip: () => void;
}

const features = [
  {
    Icon: Zap,
    title: 'Transaksi Cepat',
    desc: 'Proses penjualan dalam hitungan detik'
  },
  {
    Icon: Package,
    title: 'Manajemen Stok',
    desc: 'Pantau inventori realtime'
  },
  {
    Icon: BarChart3,
    title: 'Laporan Lengkap',
    desc: 'Analisis bisnis mendalam'
  },
  {
    Icon: Heart,
    title: 'Program Loyalty',
    desc: 'Bangun hubungan dengan pelanggan'
  },
];

export function WelcomeStep({ onNext, onSkip }: WelcomeStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center text-center py-4"
    >
      {/* Logo/Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.6, bounce: 0.4 }}
        className="mb-4"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
      </motion.div>

      {/* Title */}
      <h1 className="mb-2 text-2xl font-bold">
        Selamat Datang di <span className="text-primary">TILO</span>
      </h1>

      {/* Description */}
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        Sistem kasir (Point of Sale) modern untuk bisnis F&B dan retail Anda.
        Mari kita setup dalam 4 langkah mudah.
      </p>

      {/* Features preview */}
      <div className="mb-6 grid max-w-xl grid-cols-2 gap-3 text-left">
        {features.map((feature, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + idx * 0.1 }}
            className="flex items-start gap-3 rounded-lg border p-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <feature.Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{feature.title}</p>
              <p className="text-xs text-muted-foreground">{feature.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={onNext} className="min-w-[140px]">
          <Play className="mr-2 h-4 w-4" />
          Mulai Setup
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          Lewati untuk sekarang
        </Button>
      </div>

      {/* Time estimate */}
      <p className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        Estimasi waktu: 3-5 menit
      </p>
    </motion.div>
  );
}
