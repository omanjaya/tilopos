import { useRef, useCallback, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { useCartStore } from '@/stores/cart.store';
import { useOfflinePOS } from '@/hooks/use-offline-pos';
import {
    ProductGrid, CartPanel, PaymentPanel, ReceiptPreview, HeldBillsPanel,
    ProductModal, CustomerSelector, TableSelector, DiscountModal, ShortcutsDialog,
    OrderReadyToast, PosHeader, OfflineBanner, MobileCartBar,
} from './components';
import { usePOSShortcuts, usePosData, usePosTransaction, usePosModals } from './hooks';
import type { POSProduct, HeldBill } from '@/types/pos.types';

export function POSPage() {
    const user = useAuthStore((s) => s.user);
    const selectedOutletId = useUIStore((s) => s.selectedOutletId);
    const outletId = selectedOutletId ?? user?.outletId ?? '';
    const {
        items, heldBills, holdCurrentBill, resumeBill, removeHeldBill,
        clearPayments, customerId, customerName, tableId, tableName, discountTotal,
        setCustomer, setTable,
    } = useCartStore();

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const { isOffline, pendingCount, syncStatus, manualSync, queueTransaction } = useOfflinePOS();
    const { products, categories, isLoading, refetchProducts } = usePosData({ outletId });
    const modals = usePosModals();
    const { handleCheckoutComplete } = usePosTransaction({
        outletId,
        isOffline,
        queueTransaction,
        onSuccess: (_transaction, receipt) => {
            if (receipt) modals.openReceipt(receipt);
            modals.closePayment();
        },
    });

    const handleHoldBill = useCallback(() => {
        if (items.length === 0) return;
        const bill = holdCurrentBill();
        toast({ title: 'Pesanan Ditahan', description: `${bill.items.length} item berhasil ditahan` });
    }, [items.length, holdCurrentBill]);

    const handleResumeBill = (bill: HeldBill) => {
        resumeBill(bill);
        modals.closeHeldBills();
        toast({ title: 'Pesanan Dilanjutkan', description: `${bill.items.length} item ditambahkan ke keranjang` });
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
        onConfirmAction: () => {},
    });

    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <div className="h-screen flex flex-col bg-muted/30">
            <PosHeader
                customerId={customerId} customerName={customerName} tableId={tableId}
                tableName={tableName} discountTotal={discountTotal} heldBillsCount={heldBills.length}
                cartItemsCount={items.length} onCustomerClick={modals.openCustomerSelector}
                onTableClick={modals.openTableSelector} onDiscountClick={modals.openDiscountModal}
                onHeldBillsClick={modals.openHeldBills} onShortcutHelpClick={modals.openShortcutHelp}
                onCartClick={modals.openCartSheet} onRefreshProducts={() => void refetchProducts()}
            />

            <OfflineBanner
                isOffline={isOffline} pendingCount={pendingCount}
                syncStatus={syncStatus} onManualSync={() => void manualSync()}
            />

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                <div className="flex-1 lg:w-[65%] overflow-hidden">
                    <ProductGrid
                        products={products} categories={categories} isLoading={isLoading}
                        onProductClick={handleProductClick} searchInputRef={searchInputRef}
                        viewMode={viewMode} onViewModeChange={setViewMode}
                    />
                </div>
                <div className="hidden lg:block w-full lg:w-[35%] max-w-md shrink-0 border-l">
                    <CartPanel onCheckout={modals.openPayment} onHoldBill={handleHoldBill} />
                </div>
            </div>

            <MobileCartBar
                itemsCount={items.length} totalQuantity={totalQuantity}
                onCartClick={modals.openCartSheet}
            />

            <Sheet open={modals.showCartSheet} onOpenChange={modals.setShowCartSheet}>
                <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-2xl">
                    <SheetTitle className="sr-only">Keranjang Belanja</SheetTitle>
                    <div className="flex justify-center pt-3 pb-1">
                        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
                    </div>
                    <div className="absolute right-4 top-3 z-10">
                        <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]"
                            onClick={modals.closeCartSheet}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                    <div className="h-full overflow-hidden">
                        <CartPanel
                            onCheckout={() => { modals.closeCartSheet(); modals.openPayment(); }}
                            onHoldBill={() => { modals.closeCartSheet(); handleHoldBill(); }}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            {modals.showPayment && (
                <PaymentPanel
                    onComplete={handleCheckoutComplete}
                    onCancel={() => { modals.closePayment(); clearPayments(); }}
                />
            )}

            {modals.receiptData && (
                <ReceiptPreview data={modals.receiptData} open={modals.showReceipt}
                    onClose={modals.closeReceipt} />
            )}

            <HeldBillsPanel bills={heldBills} open={modals.showHeldBills}
                onClose={modals.closeHeldBills} onResume={handleResumeBill} onDelete={removeHeldBill} />

            <ProductModal product={modals.selectedProduct} open={!!modals.selectedProduct}
                onClose={modals.closeProductModal} />

            <CustomerSelector open={modals.showCustomerSelector}
                onClose={modals.closeCustomerSelector}
                onSelect={(customer) => {
                    if (customer) setCustomer(customer.id, customer.name);
                    else setCustomer(undefined, undefined);
                }}
                selectedCustomerId={customerId}
            />

            <TableSelector open={modals.showTableSelector} onClose={modals.closeTableSelector}
                onSelect={(table) => {
                    if (table) setTable(table.id, table.name);
                    else setTable(undefined, undefined);
                }}
                selectedTableId={tableId} outletId={outletId}
            />

            <DiscountModal open={modals.showDiscountModal} onClose={modals.closeDiscountModal} />
            <ShortcutsDialog open={modals.showShortcutHelp} onClose={modals.closeShortcutHelp} />
            <OrderReadyToast />
        </div>
    );
}
