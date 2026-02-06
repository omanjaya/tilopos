import { useMutation } from '@tanstack/react-query';
import { posApi } from '@/api/endpoints/pos.api';
import { toast } from '@/hooks/use-toast';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import type { Transaction, ReceiptData } from '@/types/pos.types';

interface UsePosTransactionProps {
    outletId: string;
    isOffline: boolean;
    queueTransaction: (request: any) => Promise<string>;
    onSuccess?: (transaction: Transaction, receipt: ReceiptData | null) => void;
}

/**
 * Hook for handling POS transactions (checkout, payment processing)
 */
export function usePosTransaction({
    outletId,
    isOffline,
    queueTransaction,
    onSuccess,
}: UsePosTransactionProps) {
    const user = useAuthStore((s) => s.user);
    const { items, payments, clearCart, clearPayments } = useCartStore();

    // Create transaction mutation
    const createTransaction = useMutation({
        mutationFn: posApi.createTransaction,
        onSuccess: async (transaction: Transaction) => {
            toast({
                title: 'Transaksi Berhasil',
                description: `No. ${transaction.transactionNumber}`,
            });

            // Fetch receipt data
            let receiptData: ReceiptData | null = null;
            try {
                receiptData = await posApi.reprintReceipt(transaction.id);
            } catch {
                // If receipt fetch fails, continue anyway
            }

            onSuccess?.(transaction, receiptData);

            clearCart();
            clearPayments();
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal Membuat Transaksi',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Handle checkout complete
    const handleCheckoutComplete = () => {
        if (items.length === 0) return;

        // Build transaction request
        const request = {
            outletId,
            employeeId: user?.employeeId ?? '',
            shiftId: 'current-shift', // TODO: get actual shift
            orderType: useCartStore.getState().orderType,
            items: items.map((item) => ({
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                modifierIds: item.modifiers.map((m) => m.id),
                notes: item.notes,
            })),
            payments: payments.map((p) => ({
                method: p.method,
                amount: p.amount,
                referenceNumber: p.referenceNumber,
            })),
            customerId: useCartStore.getState().customerId,
            tableId: useCartStore.getState().tableId,
            notes: useCartStore.getState().notes,
        };

        if (isOffline) {
            // Queue transaction locally when offline
            void queueTransaction(request).then(() => {
                toast({
                    title: 'Transaksi Disimpan Offline',
                    description: 'Akan otomatis disinkronkan saat koneksi pulih.',
                });
                clearCart();
                clearPayments();
                onSuccess?.(null as any, null);
            });
        } else {
            createTransaction.mutate(request);
        }
    };

    return {
        handleCheckoutComplete,
        isProcessing: createTransaction.isPending,
    };
}
