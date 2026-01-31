import { motion } from 'framer-motion';
import { CheckCircle, Download, MapPin, Clock, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/format';

interface OrderConfirmationProps {
  orderNumber: string;
  total: number;
  tableNumber?: string;
  estimatedTime?: number; // in minutes
  customerPhone?: string;
  onViewStatus: () => void;
  onNewOrder: () => void;
}

export function OrderConfirmation({
  orderNumber,
  total,
  tableNumber,
  estimatedTime = 15,
  customerPhone,
  onViewStatus,
  onNewOrder,
}: OrderConfirmationProps) {
  return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {/* Success animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.4 }}
            className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100"
          >
            <CheckCircle className="h-12 w-12 text-green-600" />
          </motion.div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900">Pesanan Berhasil!</h1>
          <p className="mt-2 text-muted-foreground">
            Terima kasih. Pesanan Anda sedang diproses.
          </p>

          {/* Order Number */}
          <div className="mt-6 rounded-lg bg-muted p-6">
            <p className="text-sm text-muted-foreground">Nomor Pesanan</p>
            <p className="mt-2 text-3xl font-bold">{orderNumber}</p>
          </div>

          {/* Order Details */}
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

            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Estimasi</span>
              <span className="font-medium flex items-center gap-1">
                <Clock className="h-4 w-4" />
                ~{estimatedTime} menit
              </span>
            </div>
          </div>

          {/* WhatsApp notification note */}
          {customerPhone && (
            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-left text-blue-800">
                  Notifikasi status pesanan akan dikirim via WhatsApp ke{' '}
                  <span className="font-medium">{customerPhone}</span>
                </p>
              </div>
            </div>
          )}

          <Separator className="my-6" />

          {/* Actions */}
          <div className="space-y-3">
            <Button onClick={onViewStatus} variant="outline" className="w-full">
              <MapPin className="mr-2 h-4 w-4" />
              Lacak Pesanan
            </Button>
            <Button onClick={onNewOrder} className="w-full">
              Pesan Lagi
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
