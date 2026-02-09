import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface SuccessStepProps {
  businessName: string;
  businessType: string;
  featuresEnabled: number;
}

export function SuccessStep({ businessName, businessType, featuresEnabled }: SuccessStepProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="text-center"
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>

      <h2 className="mt-4 text-xl font-bold">Pendaftaran Berhasil!</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Akun bisnis Anda siap digunakan
      </p>

      <div className="mt-6 rounded-lg bg-muted/50 p-4 text-left">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bisnis</span>
            <span className="font-medium">{businessName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tipe</span>
            <span className="font-medium">{businessType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fitur Aktif</span>
            <span className="font-medium">{featuresEnabled} fitur</span>
          </div>
        </div>
      </div>

      <Button
        className="mt-6 w-full"
        size="lg"
        onClick={() => navigate('/app', { replace: true })}
      >
        Masuk ke Dashboard
      </Button>
    </motion.div>
  );
}
