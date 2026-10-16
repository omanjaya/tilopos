import { useCallback, useRef } from 'react';
import { isAxiosError } from 'axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { posApi } from '@/api/endpoints/pos.api';
import { creditApi } from '@/api/endpoints/credit.api';
import type { CreateCreditTransactionRequest } from '@/api/endpoints/credit.api';
import { toast } from '@/lib/toast-utils';
import { handleMutationError, isErrorHandled } from '@/lib/api-error-handler';
import { hasRole } from '@/config/permissions';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { fetchCurrentShift } from '@/hooks/use-shift-status';
import { readCachedShift } from '@/services/sync/shift-cache';
import { buildOfflineReceipt } from '@/services/sync/offline-receipt';
import { generateClientTransactionId } from '@/services/sync/offline-transaction';
import type {
    OfflineTransactionInput,
    OfflineTransactionPayload,
} from '@/services/sync/offline-transaction';
import { toDiscountRequests, toItemRequests, toPreviewRequest } from '../utils/cart-request';
import type {
    CreateTransactionRequest,
    CreateTransactionResponse,
    Transaction,
    ReceiptData,
} from '@/types/pos.types';

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
    /** Active shift id known to the POS (from useShiftStatus, may come from the offline cache) */
    currentShiftId?: string | null;
    queueTransaction: (request: OfflineTransactionInput) => Promise<OfflineTransactionPayload>;
    onSuccess?: (transaction: Transaction | null, receipt: ReceiptData | null) => void;
}

type ShiftResolution =
    | { kind: 'online'; shiftId: string }
    | { kind: 'offline'; shiftId: string }
    | { kind: 'none' }
    | { kind: 'error' };

/** True when the request never got an HTTP response (offline, DNS, timeout) */
function isNetworkFailure(error: unknown): boolean {
    return isAxiosError(error) && !error.response;
}

/**
 * Hook for handling POS transactions (checkout, payment processing)
 */
export function usePosTransaction({
    outletId,
    isOffline,
    currentShiftId,
    queueTransaction,
    onSuccess,
}: UsePosTransactionProps) {
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);
    const { clearCart, clearPayments } = useCartStore();
    const isSubmittingRef = useRef(false);
    /**
     * Idempotency key of the sale being submitted. Kept after a network failure (the
     * server may have booked it) so a retry of the same cart is de-duplicated; dropped
     * once the server answered (success, or a definitive error).
     */
    const pendingClientIdRef = useRef<string | null>(null);
    const canEditPrice = hasRole(user?.role, 'SUPERVISION');

    /**
     * Find the shift to book the sale on. Offline (or server unreachable) the cached
     * shift is used; "no shift" is only reported on an explicit empty answer.
     */
    const resolveShift = useCallback(async (allowOffline: boolean): Promise<ShiftResolution> => {
        const cachedShiftId = currentShiftId ?? readCachedShift(user?.id)?.shiftId ?? null;
        if (isOffline) {
            return allowOffline && cachedShiftId ? { kind: 'offline', shiftId: cachedShiftId } : { kind: 'none' };
        }
        try {
            const shift = await fetchCurrentShift();
            return shift?.id ? { kind: 'online', shiftId: shift.id } : { kind: 'none' };
        } catch (error) {
            if (isNetworkFailure(error) && allowOffline && cachedShiftId) {
                return { kind: 'offline', shiftId: cachedShiftId };
            }
            if (!isErrorHandled(error)) {
                toast.error({
                    title: 'Gagal Memeriksa Shift',
                    description: error instanceof Error ? error.message : 'Silakan coba lagi.',
                });
            }
            return { kind: 'error' };
        }
    }, [currentShiftId, isOffline, user?.id]);

    /**
     * Exact cash amount ("Uang Pas") from POST /pos/transactions/preview with a cash
     * payment, so the server's prices, promotions and Rp500 cash rounding apply.
     * Offline (or unreachable) it falls back to the cart total; null = error shown.
     */
    const resolveCashTotal = useCallback(async (): Promise<number | null> => {
        const cart = useCartStore.getState();
        if (isOffline) return cart.total;
        try {
            const preview = await posApi.previewTransaction(
                toPreviewRequest(cart, outletId, canEditPrice, [
                    { method: 'cash', amount: Math.max(cart.total, 1) },
                ]),
            );
            return preview.grandTotal;
        } catch (error) {
            if (isNetworkFailure(error)) return cart.total;
            if (!isErrorHandled(error)) {
                toast.error({
                    title: 'Gagal Menghitung Total',
                    description: error instanceof Error ? error.message : 'Silakan coba lagi.',
                });
            }
            return null;
        }
    }, [isOffline, outletId, canEditPrice]);

    // Create transaction mutation
    const createTransaction = useMutation({
        mutationFn: posApi.createTransaction,
        onSuccess: async (response: CreateTransactionResponse) => {
            pendingClientIdRef.current = null;
            toast.success({
                title: response.duplicate ? 'Transaksi Sudah Tercatat' : 'Transaksi Berhasil',
                description: `No. ${response.receiptNumber}`,
            });

            // Fetch receipt data
            let receiptData: ReceiptData | null = null;
            try {
                receiptData = await posApi.reprintReceipt(response.transactionId);
            } catch (error) {
                console.warn('Receipt fetch failed', error);
                toast.warning({
                    title: 'Struk Belum Dapat Ditampilkan',
                    description: 'Transaksi tersimpan. Cetak ulang struk dari "Transaksi Hari Ini".',
                });
            }

            onSuccess?.(null, receiptData);

            // Invalidate caches so inventory/product screens reflect updated data
            void queryClient.invalidateQueries({ queryKey: ['products'] });
            void queryClient.invalidateQueries({ queryKey: ['inventory'] });
            void queryClient.invalidateQueries({ queryKey: ['transactions'] });
            void queryClient.invalidateQueries({ queryKey: ['shifts'] });
            void queryClient.invalidateQueries({ queryKey: ['today-transactions'] });

            clearCart();
        },
        onError: (error: Error) => {
            // A definitive server answer means the sale was not booked: next try is a new sale
            if (!isNetworkFailure(error)) pendingClientIdRef.current = null;
            // Server message (422 voucher/promo, 403 discount cap, 400 validation), one toast
            handleMutationError(error, 'Gagal Membuat Transaksi');
        },
    });

    // Handle checkout complete — memoized to prevent stale closures in consumers
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleCheckoutComplete = useCallback(async () => {
        // Prevent double-click duplicate transactions (ref-based lock + isPending check)
        if (isSubmittingRef.current || createTransaction.isPending) return;

        // Read fresh state at checkout time to avoid stale closures
        const { items, payments, orderType, customerId, tableId, notes, discountAmount, discountPercent } = useCartStore.getState();

        if (items.length === 0) return;

        if (payments.length === 0) {
            toast.error({
                title: 'Belum Ada Pembayaran',
                description: 'Tambahkan metode pembayaran terlebih dahulu.',
            });
            return;
        }

        // Lock before any await so a double tap cannot submit the same sale twice
        isSubmittingRef.current = true;

        try {
            const shift = await resolveShift(true);
            if (shift.kind === 'error') return;
            if (shift.kind === 'none') {
                toast.error({
                    title: 'Tidak Ada Shift Aktif',
                    description: isOffline
                        ? 'Shift aktif tidak diketahui saat offline. Sambungkan internet lalu mulai shift.'
                        : 'Silakan mulai shift terlebih dahulu sebelum membuat transaksi.',
                });
                return;
            }

            const discounts = toDiscountRequests(discountAmount, discountPercent);
            const itemRequests = toItemRequests(items, canEditPrice);
            const paymentRequests = payments.map((p) => ({
                method: p.method,
                amount: p.amount,
                referenceNumber: p.referenceNumber,
            }));

            if (shift.kind === 'offline') {
                // Persist locally first; only a successful save clears the cart
                let queued: OfflineTransactionPayload;
                try {
                    queued = await queueTransaction({
                        outletId,
                        shiftId: shift.shiftId,
                        orderType,
                        items: itemRequests,
                        payments: paymentRequests,
                        customerId,
                        tableId,
                        notes,
                        discounts,
                    });
                } catch (error) {
                    console.error('Offline queue failed', error);
                    toast.error({
                        title: 'Transaksi Gagal Disimpan',
                        description: 'Penyimpanan offline di perangkat gagal. Transaksi belum tercatat.',
                    });
                    return;
                }

                const cart = useCartStore.getState();
                const receipt = buildOfflineReceipt({
                    clientTransactionId: queued.clientTransactionId,
                    occurredAt: queued.occurredAt,
                    outletId,
                    outletName: user?.outletName,
                    employeeId: user?.employeeId ?? '',
                    employeeName: user?.name ?? '',
                    orderType,
                    items,
                    payments,
                    subtotal: cart.subtotal,
                    discountTotal: cart.discountTotal,
                    taxAmount: cart.taxAmount,
                    serviceCharge: cart.serviceCharge,
                    total: cart.total,
                    customerName: cart.customerName,
                    tableName: cart.tableName,
                    notes,
                });

                toast.info({
                    title: 'Transaksi Disimpan Offline',
                    description: 'Akan otomatis disinkronkan saat koneksi pulih.',
                });
                clearCart();
                clearPayments();
                onSuccess?.(null, receipt);
                return;
            }

            pendingClientIdRef.current ??= generateClientTransactionId();
            const request: CreateTransactionRequest = {
                outletId,
                shiftId: shift.shiftId,
                orderType,
                items: itemRequests,
                payments: paymentRequests,
                customerId,
                tableId,
                notes,
                discounts,
                clientTransactionId: pendingClientIdRef.current,
            };
            await createTransaction.mutateAsync(request).catch((error: unknown) => {
                // intentionally ignored here: the mutation's onError already showed the error
                console.warn('Checkout failed', error);
            });
        } finally {
            isSubmittingRef.current = false;
        }
    }, [outletId, user?.employeeId, user?.name, user?.outletName, isOffline, canEditPrice, resolveShift, createTransaction, queueTransaction, clearCart, clearPayments, onSuccess]);

    // Create credit transaction mutation
    const createCreditTransaction = useMutation({
        mutationFn: (data: CreateCreditTransactionRequest) => creditApi.create(data),
        onSuccess: () => {
            toast.success({
                title: 'BON Berhasil Dibuat',
                description: 'Transaksi piutang berhasil dicatat.',
            });

            onSuccess?.(null, null);

            // Invalidate caches so inventory/product/credit screens reflect updated data
            void queryClient.invalidateQueries({ queryKey: ['products'] });
            void queryClient.invalidateQueries({ queryKey: ['inventory'] });
            void queryClient.invalidateQueries({ queryKey: ['transactions'] });
            void queryClient.invalidateQueries({ queryKey: ['credits'] });
            void queryClient.invalidateQueries({ queryKey: ['customers'] });
            void queryClient.invalidateQueries({ queryKey: ['today-transactions'] });

            clearCart();
        },
        onError: (error: Error) => {
            handleMutationError(error, 'Gagal Membuat BON');
        },
    });

    // Handle credit/BON checkout
    const handleCreditCheckout = async (creditData: CreditCheckoutParams) => {
        // Prevent double-click duplicate transactions
        if (createCreditTransaction.isPending) return;

        const { items, orderType, tableId, notes, discountAmount, discountPercent } = useCartStore.getState();

        if (items.length === 0) return;

        if (isOffline) {
            toast.error({
                title: 'BON Membutuhkan Koneksi',
                description: 'Transaksi piutang tidak dapat dibuat saat offline.',
            });
            return;
        }

        const shift = await resolveShift(false);
        if (shift.kind === 'error') return;
        if (shift.kind !== 'online') {
            toast.error({
                title: 'Tidak Ada Shift Aktif',
                description: 'Silakan mulai shift terlebih dahulu sebelum membuat transaksi.',
            });
            return;
        }
        const shiftId = shift.shiftId;

        // Build credit transaction request
        const request: CreateCreditTransactionRequest = {
            outletId,
            customerId: creditData.customerId,
            shiftId,
            orderType,
            tableId,
            items: toItemRequests(items, canEditPrice),
            notes,
            dueDate: creditData.dueDate,
            creditNotes: creditData.creditNotes,
            discountAmount: discountPercent > 0 ? undefined : (discountAmount > 0 ? discountAmount : undefined),
            discountPercent: discountPercent > 0 ? discountPercent : undefined,
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
        resolveCashTotal,
        isProcessing: createTransaction.isPending,
        handleCreditCheckout,
        isCreditProcessing: createCreditTransaction.isPending,
    };
}
