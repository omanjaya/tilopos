import { useMutation } from '@tanstack/react-query';
import { posApi } from '@/api/endpoints/pos.api';
import { creditApi } from '@/api/endpoints/credit.api';
import type { CreateCreditTransactionRequest } from '@/api/endpoints/credit.api';
import { apiClient } from '@/api/client';
import { toast } from '@/hooks/use-toast';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import type { CreateTransactionResponse, Transaction, ReceiptData } from '@/types/pos.types';

interface CreditCheckoutParams {
    customerId: string;
    customerName: string;
    dpAmount: number;
    dpMethod: string;
    dpReference?: string;
    dueDate?: string;
    creditNotes?: string;
}

interface UsePosTransactionProps {
    outletId: string;
    isOffline: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queueTransaction: (request: any) => Promise<string>;
    onSuccess?: (transaction: Transaction | null, receipt: ReceiptData | null) => void;
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
        onSuccess: async (response: CreateTransactionResponse) => {
            toast({
                title: 'Transaksi Berhasil',
                description: `No. ${response.receiptNumber}`,
            });

            // Fetch receipt data
            let receiptData: ReceiptData | null = null;
            try {
                receiptData = await posApi.reprintReceipt(response.transactionId);
            } catch {
                // If receipt fetch fails, continue anyway
            }

            onSuccess?.(null, receiptData);

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
    const handleCheckoutComplete = async () => {
        if (items.length === 0) return;

        // Fetch current active shift from backend
        let shiftId: string | null = null;
        try {
            const res = await apiClient.get('/employees/shifts/current');
            shiftId = (res.data as { id: string })?.id ?? null;
        } catch {
            // No active shift
        }

        if (!shiftId) {
            toast({
                title: 'Tidak Ada Shift Aktif',
                description: 'Silakan mulai shift terlebih dahulu sebelum membuat transaksi.',
                variant: 'destructive',
            });
            return;
        }

        // Build transaction request
        const request = {
            outletId,
            employeeId: user?.employeeId ?? '',
            shiftId,
            orderType: useCartStore.getState().orderType,
            items: items.map((item) => ({
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                modifierIds: item.modifiers.map((m) => m.id),
                notes: item.notes,
                unitPrice: item.originalPrice ? item.price : undefined,
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
                onSuccess?.(null, null);
            });
        } else {
            createTransaction.mutate(request);
        }
    };

    // Create credit transaction mutation
    const createCreditTransaction = useMutation({
        mutationFn: (data: CreateCreditTransactionRequest) => creditApi.create(data),
        onSuccess: () => {
            toast({
                title: 'BON Berhasil Dibuat',
                description: 'Transaksi piutang berhasil dicatat.',
            });

            onSuccess?.(null, null);
            clearCart();
            clearPayments();
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal Membuat BON',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Handle credit/BON checkout
    const handleCreditCheckout = async (creditData: CreditCheckoutParams) => {
        if (items.length === 0) return;

        // Fetch current active shift
        let shiftId: string | null = null;
        try {
            const res = await apiClient.get('/employees/shifts/current');
            shiftId = (res.data as { id: string })?.id ?? null;
        } catch {
            // No active shift
        }

        if (!shiftId) {
            toast({
                title: 'Tidak Ada Shift Aktif',
                description: 'Silakan mulai shift terlebih dahulu sebelum membuat transaksi.',
                variant: 'destructive',
            });
            return;
        }

        // Build credit transaction request
        const request: CreateCreditTransactionRequest = {
            outletId,
            employeeId: user?.employeeId ?? '',
            customerId: creditData.customerId,
            shiftId,
            orderType: useCartStore.getState().orderType,
            tableId: useCartStore.getState().tableId,
            items: items.map((item) => ({
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
                modifierIds: item.modifiers.map((m) => m.id),
                notes: item.notes,
                unitPrice: item.originalPrice ? item.price : undefined,
            })),
            notes: useCartStore.getState().notes,
            dueDate: creditData.dueDate,
            creditNotes: creditData.creditNotes,
        };

        // Add down payment if provided
        if (creditData.dpAmount > 0) {
            request.payments = [
                {
                    method: creditData.dpMethod,
                    amount: creditData.dpAmount,
                    referenceNumber: creditData.dpReference,
                },
            ];
        }

        createCreditTransaction.mutate(request);
    };

    return {
        handleCheckoutComplete,
        isProcessing: createTransaction.isPending,
        handleCreditCheckout,
        isCreditProcessing: createCreditTransaction.isPending,
    };
}
