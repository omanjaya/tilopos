import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OfflineErrorAlertProps {
  show: boolean;
}

/**
 * Temporary alert shown when user tries to submit order while offline
 */
export function OfflineErrorAlert({ show }: OfflineErrorAlertProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mx-auto max-w-4xl px-4 pt-4"
        >
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Tidak dapat terhubung ke server. Periksa koneksi internet Anda.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
