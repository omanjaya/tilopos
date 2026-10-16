import { useHeldBills } from './hooks/use-held-bills';
import { useRef, useCallback, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { toast } from '@/lib/toast-utils';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { useCartStore } from '@/stores/cart.store';
import { useFeatureStore } from '@/stores/feature.store';
import { featuresApi } from '@/api/endpoints/features.api';
import { posApi } from '@/api/endpoints/pos.api';
import { apiErrorMessage } from './utils/api-error';
import { useOfflinePOS } from '@/hooks/use-offline-pos';
import { usePosTaxConfig } from '@/hooks/use-pos-tax-config';
import { FeatureGate, FEATURES } from '@/components/shared/feature-gate';
import {
    ProductGrid, CartPanel, PaymentPanel, ReceiptPreview, HeldBillsPanel,
    ProductModal, BundleModal, CustomerSelector, TableSelector, DiscountModal, ShortcutsDialog,
    OrderReadyToast, PosHeader, OfflineBanner, MobileCartBar, TodayTransactionsSheet,
    ShiftStartModal, ShiftEndModal, CashDrawerModal,
} from './components';
import { usePOSShortcuts, usePosData, usePosTransaction, usePosModals } from './hooks';
import { useShiftStatus } from '@/hooks/use-shift-status';
import type { POSProduct, HeldBill } from '@/types/pos.types';
import type { BundlePackage } from '@/types/bundle.types';

export function POSPage() {
    const user = useAuthStore((s) => s.user);
    const selectedOutletId = useUIStore((s) => s.selectedOutletId);
    const outletId = selectedOutletId ?? user?.outletId ?? '';
    const {
        items,
        clearPayments, customerId, customerName, tableId, tableName, discountTotal,
        setCustomer, setTable, total,
    } = useCartStore();

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedBundle, setSelectedBundle] = useState<BundlePackage | null>(null);
    const [showShiftStart, setShowShiftStart] = useState(false);
    const [showShiftEnd, setShowShiftEnd] = useState(false);
    const [shiftCheckDone, setShiftCheckDone] = useState(false);
    const [cashDrawerType, setCashDrawerType] = useState<'cash_in' | 'cash_out' | null>(null);
    const [featureLoadError, setFeatureLoadError] = useState(false);
    const [featureRetryKey, setFeatureRetryKey] = useState(0);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const {
        isOffline, pendingCount, failedItems, syncStatus, manualSync, queueTransaction, retryItem, discardItem,
    } = useOfflinePOS();
    const held = useHeldBills(outletId, isOffline);
    // Outlet tax / service charge from the server so cart totals match server totals
    usePosTaxConfig(outletId || null);
    const {
        products, categories, bundles, isLoading, refetchProducts,
        isError: isDataError, error: dataError, refetchAll,
    } = usePosData({ outletId });
    const modals = usePosModals();
    const { currentShift, refetchShift, isLoading: isShiftLoading } = useShiftStatus();

    // Real shift record (opening cash) — never display a hard-coded Rp0
    const { data: shiftRecord } = useQuery({
        queryKey: ['pos', 'shift-record', currentShift?.shiftId],
        queryFn: posApi.getCurrentShiftRecord,
        enabled: !!currentShift?.shiftId && !isOffline,
    });
    const headerShift = currentShift ? {
        id: currentShift.shiftId,
        startedAt: currentShift.startedAt,
        openingCash: shiftRecord?.id === currentShift.shiftId ? shiftRecord.openingCash : currentShift.openingCash,
    } : null;

    const handlePrintTransaction = useCallback(async (transactionId: string) => {
        try {
            const receipt = await posApi.reprintReceipt(transactionId);
            modals.openReceipt(receipt);
        } catch (error) {
            toast.error({ title: 'Gagal Memuat Struk', description: apiErrorMessage(error) });
        }
    }, [modals]);

    // Load business features for POS (FeatureGate needs this)
    const featureStoreLoaded = useFeatureStore((s) => s.isLoaded);
    useEffect(() => {
        if (featureStoreLoaded || !outletId) return;
        const { setEnabledFeatures, setBusinessType, setOutletType } = useFeatureStore.getState();
        featuresApi.getOutletEnabledFeatures(outletId).then(setEnabledFeatures).catch(() => {
            featuresApi.getEnabledFeatures().then(setEnabledFeatures).catch((error: unknown) => {
                // Don't silently hide gated POS features: leave the store unloaded
                // (FeatureGate shows everything) and tell the cashier.
                setFeatureLoadError(true);
                toast.error({
                    title: 'Gagal memuat fitur outlet',
                    description: apiErrorMessage(error, 'Beberapa fitur mungkin tidak tersedia. Muat ulang halaman.'),
                });
            });
        });
        featuresApi.getOutletType(outletId).then((data) => {
            setOutletType(data.outletType?.code ?? null);
        }).catch(() => {
            featuresApi.getBusinessType().then((data) => {
                setBusinessType(data.businessType?.code ?? null);
            }).catch((error: unknown) => {
                // intentionally ignored: business type only tunes defaults; features still load
                console.warn('Failed to load business type', error);
            });
        });
    }, [outletId, featureStoreLoaded, featureRetryKey]);

    // Derive shift modal state from the hook instead of a duplicate API call
    useEffect(() => {
        if (isShiftLoading) return;
        setShiftCheckDone(true);
        setShowShiftStart(!currentShift);
    }, [currentShift, isShiftLoading]);
    const { handleCheckoutComplete, resolveCashTotal, isProcessing, handleCreditCheckout, isCreditProcessing } = usePosTransaction({
        outletId,
        isOffline,
        currentShiftId: currentShift?.shiftId ?? null,
        queueTransaction,
        onSuccess: (_transaction, receipt) => {
            if (receipt) modals.openReceipt(receipt);
            modals.closePayment();
        },
    });

    const handleQuickCashCheckout = useCallback(async () => {
        if (items.length === 0 || isProcessing) return;
        // Exact cash total from the server (prices, promotions, Rp500 cash rounding)
        const amount = await resolveCashTotal();
        if (amount === null) return;
        const { clearPayments, addPayment } = useCartStore.getState();
        clearPayments();
        addPayment({ method: 'cash', amount });
        void handleCheckoutComplete();
    }, [items.length, isProcessing, resolveCashTotal, handleCheckoutComplete]);

    const handleHoldBill = async () => {
        if (items.length === 0 || held.busy) return;
        try {
            const bill = await held.hold();
            toast.success({ title: bill.syncState === 'synced' ? 'Pesanan tersimpan di server' : 'Pesanan tersimpan di perangkat',
                description: bill.syncState === 'synced' ? `${bill.items.length} item ditahan` : 'Akan dikirim saat online. Pesanan belum tersedia di terminal lain.' });
        } catch (error) {
            toast.error({ title: 'Belum tersimpan di server', description: apiErrorMessage(error, 'Salinan pesanan tetap tersimpan di perangkat. Coba lagi dari daftar pesanan ditahan.') });
        }
    };

    const handleResumeBill = async (bill: HeldBill) => {
        if (held.busy) return;
        try {
            await held.resume(bill.id);
            modals.closeHeldBills();
            toast.success({ title: 'Pesanan dilanjutkan', description: `${bill.items.length} item ditambahkan ke keranjang` });
        } catch (error) {
            toast.error({ title: 'Gagal melanjutkan pesanan', description: apiErrorMessage(error) });
        }
    };
    const handleDeleteBill = async (id: string) => {
        if (held.busy) return;
        try { await held.discard(id); }
        catch (error) { toast.error({ title: 'Gagal menghapus pesanan', description: apiErrorMessage(error) }); }
    };

    const handleProductClick = (product: POSProduct) => {
        if (product.variants.length > 0 || product.modifierGroups.length > 0) {
            modals.openProductModal(product);
        } else {
            useCartStore.getState().addItem({
                productId: product.id, name: product.name, price: product.basePrice,
                quantity: 1, modifiers: [], imageUrl: product.imageUrl,
            });
        }
    };

    const handleBundleClick = (bundle: BundlePackage) => {
        setSelectedBundle(bundle);
    };

    const handleToggleViewMode = useCallback(() => {
        setViewMode((prev) => (prev === 'grid' ? 'list' : 'grid'));
    }, []);

    usePOSShortcuts({
        onFocusSearch: () => searchInputRef.current?.focus(),
        onToggleViewMode: handleToggleViewMode,
        onOpenCustomerSelector: modals.openCustomerSelector,
        onOpenTableSelector: modals.openTableSelector,
        onHoldBill: handleHoldBill,
        onResumeHeldBill: modals.openHeldBills,
        onOpenDiscountModal: modals.openDiscountModal,
        onProcessPayment: () => { if (items.length > 0) modals.openPayment(); },
        onPrintReceipt: () => { if (modals.receiptData) modals.setShowReceipt(true); },
        onOpenShortcutHelp: modals.openShortcutHelp,
        onCloseModal: modals.closeAllModals,
        onQuickCashCheckout: handleQuickCashCheckout,
    });

    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <div className="h-screen flex flex-col bg-muted/30">
            <PosHeader
                customerId={customerId} customerName={customerName} tableId={tableId}
                tableName={tableName} discountTotal={discountTotal} heldBillsCount={held.bills.length}
                cartItemsCount={items.length} onCustomerClick={modals.openCustomerSelector}
                onTableClick={modals.openTableSelector} onDiscountClick={modals.openDiscountModal}
                onHeldBillsClick={modals.openHeldBills} onShortcutHelpClick={modals.openShortcutHelp}
                onCartClick={modals.openCartSheet} onRefreshProducts={() => void refetchProducts()}
                onTodayTransactionsClick={modals.openTodayTransactions}
                onStartShift={() => setShowShiftStart(true)}
                currentShift={headerShift}
                onEndShift={() => setShowShiftEnd(true)}
                onCashIn={() => setCashDrawerType('cash_in')}
                onCashOut={() => setCashDrawerType('cash_out')}
            />

            {featureLoadError && (
                <div role="alert" className="flex items-center justify-between gap-2 bg-destructive/10 text-destructive text-sm px-4 py-2">
                    <span>Gagal memuat pengaturan fitur outlet. Beberapa fitur mungkin tidak sesuai.</span>
                    <Button variant="outline" size="sm" onClick={() => { setFeatureLoadError(false); setFeatureRetryKey((k) => k + 1); }}>
                        Coba Lagi
                    </Button>
                </div>
            )}

            <OfflineBanner
                isOffline={isOffline} pendingCount={pendingCount}
                syncStatus={syncStatus} onManualSync={() => void manualSync()}
                failedItems={failedItems}
                onRetryItem={(id) => {
                    retryItem(id).catch((error: unknown) => {
                        toast.error({ title: 'Gagal Mengulang Sinkronisasi', description: apiErrorMessage(error) });
                    });
                }}
                onDiscardItem={(id) => {
                    discardItem(id).catch((error: unknown) => {
                        toast.error({ title: 'Gagal Menghapus Transaksi Offline', description: apiErrorMessage(error) });
                    });
                }}
            />

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                <div className="flex-1 lg:w-[65%] overflow-hidden">
                    <ProductGrid
                        products={products} categories={categories} bundles={bundles}
                        isLoading={isLoading}
                        isError={isDataError}
                        error={dataError}
                        onRetry={() => void refetchAll()}
                        onProductClick={handleProductClick} onBundleClick={handleBundleClick}
                        searchInputRef={searchInputRef}
                        viewMode={viewMode} onViewModeChange={setViewMode}
                    />
                </div>
                <div className="hidden lg:flex w-full lg:w-[35%] max-w-md shrink-0 border-l flex-col">
                    {modals.showPayment ? (
                        <PaymentPanel
                            mode="inline"
                            onComplete={handleCheckoutComplete}
                            onCancel={() => { modals.closePayment(); clearPayments(); }}
                            isProcessing={isProcessing}
                            onCreditComplete={(data) => void handleCreditCheckout(data)}
                            isCreditProcessing={isCreditProcessing}
                        />
                    ) : (
                        <CartPanel onCheckout={modals.openPayment} onHoldBill={handleHoldBill} onQuickCashCheckout={handleQuickCashCheckout} />
                    )}
                </div>
            </div>

            <MobileCartBar
                itemsCount={items.length} totalQuantity={totalQuantity}
                total={total}
                onCartClick={modals.openCartSheet}
                onQuickCashCheckout={handleQuickCashCheckout}
            />

            <Sheet open={modals.showCartSheet} onOpenChange={modals.setShowCartSheet}>
                <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-2xl">
                    <SheetTitle className="sr-only">Keranjang Belanja</SheetTitle>
                    <div className="flex justify-center pt-3 pb-1">
                        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
                    </div>
                    <div className="absolute right-4 top-3 z-10">
                        <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]"
                            onClick={modals.closeCartSheet} aria-label="Tutup keranjang">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                    <div className="h-full overflow-hidden">
                        <CartPanel
                            onCheckout={() => { modals.closeCartSheet(); modals.openPayment(); }}
                            onHoldBill={() => { modals.closeCartSheet(); handleHoldBill(); }}
                            onQuickCashCheckout={() => { modals.closeCartSheet(); handleQuickCashCheckout(); }}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            {modals.showPayment && (
                <div className="lg:hidden">
                    <PaymentPanel
                        mode="modal"
                        onComplete={handleCheckoutComplete}
                        onCancel={() => { modals.closePayment(); clearPayments(); }}
                        isProcessing={isProcessing}
                        onCreditComplete={(data) => void handleCreditCheckout(data)}
                        isCreditProcessing={isCreditProcessing}
                    />
                </div>
            )}

            {modals.receiptData && (
                <ReceiptPreview data={modals.receiptData} open={modals.showReceipt}
                    onClose={modals.closeReceipt} />
            )}

            <HeldBillsPanel bills={held.bills} open={modals.showHeldBills}
                onClose={modals.closeHeldBills} onResume={(bill) => void handleResumeBill(bill)} onDelete={(id) => void handleDeleteBill(id)}
                busy={held.busy} isLoading={held.isLoading} error={held.error} onRetry={held.retry} isOffline={isOffline}
                legacyCount={held.legacyCount} onAdoptLegacy={held.adoptLegacy} />

            <ProductModal product={modals.selectedProduct} open={!!modals.selectedProduct}
                onClose={modals.closeProductModal} />

            <BundleModal bundle={selectedBundle} open={!!selectedBundle}
                onClose={() => setSelectedBundle(null)} />

            <CustomerSelector open={modals.showCustomerSelector}
                onClose={modals.closeCustomerSelector}
                onSelect={(customer) => {
                    if (customer) setCustomer(customer.id, customer.name);
                    else setCustomer(undefined, undefined);
                }}
                selectedCustomerId={customerId}
            />

            <FeatureGate feature={FEATURES.TABLE_MANAGEMENT}>
                <TableSelector open={modals.showTableSelector} onClose={modals.closeTableSelector}
                    onSelect={(table) => {
                        if (table) setTable(table.id, table.name);
                        else setTable(undefined, undefined);
                    }}
                    selectedTableId={tableId} outletId={outletId}
                />
            </FeatureGate>

            <DiscountModal open={modals.showDiscountModal} onClose={modals.closeDiscountModal} />
            <ShortcutsDialog open={modals.showShortcutHelp} onClose={modals.closeShortcutHelp} />

            <TodayTransactionsSheet
                open={modals.showTodayTransactions}
                onClose={modals.closeTodayTransactions}
                outletId={outletId}
                onPrintReceipt={(tx) => void handlePrintTransaction(tx.id)}
            />

            <ShiftStartModal
                open={showShiftStart && shiftCheckDone}
                onClose={() => setShowShiftStart(false)}
                onSuccess={() => {
                    setShowShiftStart(false);
                    void refetchShift();
                    void refetchProducts();
                }}
                outletId={outletId}
            />

            <ShiftEndModal
                open={showShiftEnd}
                onClose={() => setShowShiftEnd(false)}
                onSuccess={() => {
                    setShowShiftEnd(false);
                    void refetchShift();
                }}
                shiftData={headerShift}
            />

            <CashDrawerModal
                open={cashDrawerType !== null}
                type={cashDrawerType ?? 'cash_in'}
                shiftId={currentShift?.shiftId ?? null}
                onClose={() => setCashDrawerType(null)}
            />

            <OrderReadyToast />
        </div>
    );
}
