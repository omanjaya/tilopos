import { useState } from 'react';
import { ReceiptPreview } from '@/features/pos/components/receipt-preview';
import { transactionsApi } from '@/api/endpoints/transactions.api';
import { handleMutationError } from '@/lib/api-error-handler';
import type { ReceiptData } from '@/types/pos.types';

/**
 * Fetches the reprint payload and shows it in ReceiptPreview, whose print
 * button triggers the actual print. No success toast until something is shown.
 */
export function useReprint() {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const reprint = async (id: string) => {
    setLoadingId(id);
    try {
      const data = await transactionsApi.reprint(id);
      setReceipt(data as unknown as ReceiptData);
    } catch (error) {
      handleMutationError(error, 'Gagal memuat struk untuk dicetak ulang');
    } finally {
      setLoadingId(null);
    }
  };

  const dialog = receipt ? (
    <ReceiptPreview data={receipt} open={!!receipt} onClose={() => setReceipt(null)} />
  ) : null;

  return { reprint, loadingId, dialog };
}
