import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/format';

interface OrderConfirmationProps {
  orderNumber: string;
  /** Server-computed grand total. */
  total: number;
  tableNumber?: string | null;
}

/**
 * Shown after the session was submitted. The session is closed server-side
 * (status 'submitted'), so there is no "order again" or tracking from here.
 */
export function OrderConfirmation({ orderNumber, total, tableNumber }: OrderConfirmationProps) {
  return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.4 }}
            className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100"
          >
            <CheckCircle className="h-12 w-12 text-green-600" />
          </motion.div>

          <h1 className="text-2xl font-bold text-gray-900">Pesanan Terkirim!</h1>
          <p className="mt-2 text-muted-foreground">
            Terima kasih. Pesanan Anda sudah diteruskan ke dapur.
          </p>

          <div className="mt-6 rounded-lg bg-muted p-6">
            <p className="text-sm text-muted-foreground">Nomor Pesanan</p>
            <p className="mt-2 text-3xl font-bold">{orderNumber}</p>
          </div>

          <div className="mt-6 space-y-4">
            {tableNumber && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Nomor Meja</span>
                <span className="font-medium">{tableNumber}</span>
              </div>
            )}

            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-lg">{formatCurrency(total)}</span>
            </div>
          </div>

          <Separator className="my-6" />

          <p className="text-sm text-muted-foreground">
            Ingin menambah pesanan? Silakan hubungi staf kami.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
