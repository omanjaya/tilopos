import { Card } from '@/components/ui/card';
import { UtensilsCrossed } from 'lucide-react';

/**
 * Error state component for invalid or expired sessions
 */
export function SessionNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <UtensilsCrossed className="mx-auto h-16 w-16 text-gray-400" />
        <h2 className="mt-4 text-xl font-semibold">Sesi Tidak Ditemukan</h2>
        <p className="mt-2 text-gray-600">
          QR code yang Anda scan tidak valid atau telah kedaluwarsa. Silakan minta bantuan dari
          staff kami.
        </p>
      </Card>
    </div>
  );
}
