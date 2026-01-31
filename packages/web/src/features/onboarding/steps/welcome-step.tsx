import { motion } from 'framer-motion';
import { Sparkles, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WelcomeStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export function WelcomeStep({ onNext, onSkip }: WelcomeStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center text-center py-8"
    >
      {/* Logo/Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.6, bounce: 0.4 }}
        className="mb-6"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
      </motion.div>

      {/* Title */}
      <h1 className="mb-3 text-3xl font-bold">
        Selamat Datang di <span className="text-primary">TILO</span>
      </h1>

      {/* Description */}
      <p className="mb-8 max-w-md text-muted-foreground">
        Sistem kasir (Point of Sale) modern untuk bisnis F&B dan retail Anda.
        Mari kita setup dalam 4 langkah mudah.
      </p>

      {/* Features preview */}
      <div className="mb-8 grid max-w-2xl grid-cols-2 gap-4 text-left">
        {[
          { icon: '🚀', title: 'Transaksi Cepat', desc: 'Proses penjualan dalam hitungan detik' },
          { icon: '📦', title: 'Manajemen Stok', desc: 'Pantau inventori realtime' },
          { icon: '📊', title: 'Laporan Lengkap', desc: 'Analisis bisnis mendalam' },
          { icon: '👨‍👩‍👧‍👦', title: 'Program Loyalty', desc: 'Bangun hubungan dengan pelanggan' },
        ].map((feature, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + idx * 0.1 }}
            className="flex items-start gap-3 rounded-lg border p-3"
          >
            <span className="text-2xl">{feature.icon}</span>
            <div>
              <p className="font-medium">{feature.title}</p>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={onNext} className="min-w-[160px]">
          <Play className="mr-2 h-4 w-4" />
          Mulai Setup
        </Button>
        <Button size="lg" variant="ghost" onClick={onSkip}>
          Lewati untuk sekarang
        </Button>
      </div>

      {/* Time estimate */}
      <p className="mt-6 text-sm text-muted-foreground">
        ⏱️ Estimasi waktu: 3-5 menit
      </p>
    </motion.div>
  );
}
