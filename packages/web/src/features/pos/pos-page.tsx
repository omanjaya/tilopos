import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Menu,
    FileText,
    Users,
    Settings,
    LogOut,
    PlusCircle,
    MinusCircle,
    RefreshCw,
    Tag,
    LayoutGrid,
    User,
    Keyboard,
    ShoppingCart,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { useCartStore } from '@/stores/cart.store';
import { posApi } from '@/api/endpoints/pos.api';
import {
    ProductGrid,
    CartPanel,
    PaymentPanel,
    ReceiptPreview,
    HeldBillsPanel,
    OrderTypeButtons,
    ProductModal,
    CustomerSelector,
    TableSelector,
    DiscountModal,
    ShortcutsDialog,
    OrderReadyToast,
} from './components';
import { usePOSShortcuts } from './hooks/use-pos-shortcuts';
import { useOfflinePOS } from '@/hooks/use-offline-pos';
import type { POSProduct, ReceiptData, HeldBill, Transaction } from '@/types/pos.types';
import { cn } from '@/lib/utils';

export function POSPage() {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const selectedOutletId = useUIStore((s) => s.selectedOutletId);
    const outletId = selectedOutletId ?? user?.outletId ?? '';

    const {
        items,
        heldBills,
        clearCart,
        holdCurrentBill,
        resumeBill,
        removeHeldBill,
        clearPayments,
        payments,
        customerId,
        customerName,
        tableId,
        tableName,
        discountTotal,
        setCustomer,
        setTable,
    } = useCartStore();

    // UI State
    const [showPayment, setShowPayment] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [showHeldBills, setShowHeldBills] = useState(false);
    const [showCustomerSelector, setShowCustomerSelector] = useState(false);
    const [showTableSelector, setShowTableSelector] = useState(false);
    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [showShortcutHelp, setShowShortcutHelp] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<POSProduct | null>(null);
    const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

    // View mode for product grid (grid / list)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Mobile/Tablet cart sheet
    const [showCartSheet, setShowCartSheet] = useState(false);

    // Offline POS support
    const { isOffline, pendingCount, syncStatus, manualSync, queueTransaction } = useOfflinePOS();

    // Ref for search input focus
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Fetch products
    const {
        data: products = [],
        isLoading: productsLoading,
        refetch: refetchProducts,
    } = useQuery({
        queryKey: ['pos', 'products', outletId],
        queryFn: () => posApi.getProducts(outletId),
        enabled: !!outletId,
    });

    // Fetch categories
    const { data: categories = [], isLoading: categoriesLoading } = useQuery({
        queryKey: ['pos', 'categories', outletId],
        queryFn: () => posApi.getCategories(outletId),
        enabled: !!outletId,
    });

    // Create transaction mutation
    const createTransaction = useMutation({
        mutationFn: posApi.createTransaction,
        onSuccess: async (transaction: Transaction) => {
            toast({
                title: 'Transaksi Berhasil',
                description: `No. ${transaction.transactionNumber}`,
            });

            // Fetch receipt data
            try {
                const receipt = await posApi.reprintReceipt(transaction.id);
                setReceiptData(receipt);
                setShowReceipt(true);
            } catch {
                // If receipt fetch fails, just clear cart
                clearCart();
            }

            clearCart();
            clearPayments();
            setShowPayment(false);
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
                setShowPayment(false);
            });
        } else {
            createTransaction.mutate(request);
        }
    };

    // Handle hold bill
    const handleHoldBill = useCallback(() => {
        if (items.length === 0) return;

        const bill = holdCurrentBill();
        toast({
            title: 'Pesanan Ditahan',
            description: `${bill.items.length} item berhasil ditahan`,
        });
    }, [items.length, holdCurrentBill]);

    // Handle resume bill
    const handleResumeBill = (bill: HeldBill) => {
        resumeBill(bill);
        setShowHeldBills(false);
        toast({
            title: 'Pesanan Dilanjutkan',
            description: `${bill.items.length} item ditambahkan ke keranjang`,
        });
    };

    // Handle product click
    const handleProductClick = (product: POSProduct) => {
        // If product has variants or modifiers, show modal
        if (product.variants.length > 0 || product.modifierGroups.length > 0) {
            setSelectedProduct(product);
        } else {
            // Direct add to cart
            useCartStore.getState().addItem({
                productId: product.id,
                name: product.name,
                price: product.basePrice,
                quantity: 1,
                modifiers: [],
                imageUrl: product.imageUrl,
            });
        }
    };

    // Toggle view mode between grid and list
    const handleToggleViewMode = useCallback(() => {
        setViewMode((prev) => (prev === 'grid' ? 'list' : 'grid'));
    }, []);

    // Close all modals
    const closeAllModals = useCallback(() => {
        setShowPayment(false);
        setShowHeldBills(false);
        setShowCustomerSelector(false);
        setShowTableSelector(false);
        setShowDiscountModal(false);
        setShowShortcutHelp(false);
        setSelectedProduct(null);
        setShowCartSheet(false);
    }, []);

    // Keyboard shortcuts
    usePOSShortcuts({
        onFocusSearch: () => {
            searchInputRef.current?.focus();
        },
        onToggleViewMode: handleToggleViewMode,
        onOpenCustomerSelector: () => setShowCustomerSelector(true),
        onOpenTableSelector: () => setShowTableSelector(true),
        onHoldBill: handleHoldBill,
        onResumeHeldBill: () => setShowHeldBills(true),
        onOpenDiscountModal: () => setShowDiscountModal(true),
        onProcessPayment: () => {
            if (items.length > 0) setShowPayment(true);
        },
        onPrintReceipt: () => {
            if (receiptData) setShowReceipt(true);
        },
        onOpenShortcutHelp: () => setShowShortcutHelp(true),
        onCloseModal: closeAllModals,
        onConfirmAction: () => {
            // Enter confirms the current modal action; no-op when nothing is open
        },
    });

    const isLoading = productsLoading || categoriesLoading;

    return (
        <div className="h-screen flex flex-col bg-muted/30">
            {/* Header */}
            <header className="h-14 md:h-16 bg-card border-b flex items-center justify-between px-3 md:px-4 shrink-0">
                <div className="flex items-center gap-2 md:gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/app')} className="min-h-[44px] min-w-[44px]">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="font-semibold text-base md:text-lg">POS Terminal</h1>
                        <p className="text-xs text-muted-foreground">
                            {user?.name} {user?.outletName ? `\u2022 ${user.outletName}` : ''}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                    {/* Order Type - hidden on small screens, in dropdown */}
                    <div className="hidden md:block">
                        <OrderTypeButtons />
                    </div>

                    {/* Customer Button */}
                    <Button
                        variant={customerId ? 'default' : 'outline'}
                        size="sm"
                        className="gap-2 min-h-[44px]"
                        onClick={() => setShowCustomerSelector(true)}
                    >
                        <User className="h-4 w-4" />
                        <span className="hidden lg:inline">
                            {customerName || 'Pelanggan'}
                        </span>
                    </Button>

                    {/* Table Button (only for dine-in) */}
                    <Button
                        variant={tableId ? 'default' : 'outline'}
                        size="sm"
                        className="gap-2 min-h-[44px]"
                        onClick={() => setShowTableSelector(true)}
                    >
                        <LayoutGrid className="h-4 w-4" />
                        <span className="hidden lg:inline">
                            {tableName || 'Meja'}
                        </span>
                    </Button>

                    {/* Discount Button */}
                    <Button
                        variant={discountTotal > 0 ? 'default' : 'outline'}
                        size="sm"
                        className="gap-2 min-h-[44px] hidden sm:inline-flex"
                        onClick={() => setShowDiscountModal(true)}
                    >
                        <Tag className="h-4 w-4" />
                        <span className="hidden lg:inline">Diskon</span>
                        {discountTotal > 0 && (
                            <Badge variant="secondary" className="ml-1 bg-green-500/20 text-green-400">
                                -{discountTotal.toLocaleString('id-ID')}
                            </Badge>
                        )}
                    </Button>

                    {/* Held Bills Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 min-h-[44px] hidden sm:inline-flex"
                        onClick={() => setShowHeldBills(true)}
                    >
                        <FileText className="h-4 w-4" />
                        <span className="hidden lg:inline">Ditahan</span>
                        {heldBills.length > 0 && (
                            <Badge variant="destructive" className="ml-1">
                                {heldBills.length}
                            </Badge>
                        )}
                    </Button>

                    {/* Keyboard Shortcut Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="min-h-[44px] min-w-[44px] hidden sm:inline-flex"
                        onClick={() => setShowShortcutHelp(true)}
                        title="Pintasan Keyboard (F10)"
                    >
                        <Keyboard className="h-4 w-4" />
                    </Button>

                    {/* Cart button for mobile/tablet */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 min-h-[44px] lg:hidden relative"
                        onClick={() => setShowCartSheet(true)}
                    >
                        <ShoppingCart className="h-4 w-4" />
                        {items.length > 0 && (
                            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                                {items.length}
                            </Badge>
                        )}
                    </Button>

                    {/* Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            {/* Order type toggle for mobile */}
                            <div className="md:hidden px-2 py-2">
                                <OrderTypeButtons className="w-full" />
                            </div>
                            <div className="md:hidden">
                                <DropdownMenuSeparator />
                            </div>
                            <DropdownMenuItem onClick={() => refetchProducts()}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh Produk
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Cash In
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <MinusCircle className="h-4 w-4 mr-2" />
                                Cash Out
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="sm:hidden" onClick={() => setShowDiscountModal(true)}>
                                <Tag className="h-4 w-4 mr-2" />
                                Diskon
                            </DropdownMenuItem>
                            <DropdownMenuItem className="sm:hidden" onClick={() => setShowHeldBills(true)}>
                                <FileText className="h-4 w-4 mr-2" />
                                Pesanan Ditahan
                                {heldBills.length > 0 && (
                                    <Badge variant="destructive" className="ml-auto">
                                        {heldBills.length}
                                    </Badge>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowCustomerSelector(true)}>
                                <Users className="h-4 w-4 mr-2" />
                                Pilih Pelanggan
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowTableSelector(true)}>
                                <LayoutGrid className="h-4 w-4 mr-2" />
                                Pilih Meja
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setShowShortcutHelp(true)}>
                                <Keyboard className="h-4 w-4 mr-2" />
                                Pintasan Keyboard
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate('/app/settings')}>
                                <Settings className="h-4 w-4 mr-2" />
                                Pengaturan
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={logout} className="text-destructive">
                                <LogOut className="h-4 w-4 mr-2" />
                                Keluar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Offline Banner */}
            {(isOffline || pendingCount > 0) && (
                <div
                    className={cn(
                        'px-4 py-2 text-sm flex items-center justify-between shrink-0',
                        isOffline
                            ? 'bg-destructive/10 text-destructive'
                            : syncStatus === 'syncing'
                              ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                              : 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
                    )}
                >
                    <span>
                        {isOffline
                            ? `Mode Offline — ${pendingCount} transaksi menunggu sinkronisasi`
                            : syncStatus === 'syncing'
                              ? 'Menyinkronkan transaksi offline...'
                              : `${pendingCount} transaksi belum disinkronkan`}
                    </span>
                    {!isOffline && pendingCount > 0 && syncStatus !== 'syncing' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => void manualSync()}
                        >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Sinkronkan
                        </Button>
                    )}
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Product Grid - Full width on mobile/tablet, 65% on desktop */}
                <div className="flex-1 lg:w-[65%] overflow-hidden">
                    <ProductGrid
                        products={products}
                        categories={categories}
                        isLoading={isLoading}
                        onProductClick={handleProductClick}
                        searchInputRef={searchInputRef}
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                    />
                </div>

                {/* Cart Panel - Sidebar on desktop, hidden on mobile/tablet (use sheet) */}
                <div className="hidden lg:block w-full lg:w-[35%] max-w-md shrink-0 border-l">
                    <CartPanel
                        onCheckout={() => setShowPayment(true)}
                        onHoldBill={handleHoldBill}
                    />
                </div>
            </div>

            {/* Mobile/Tablet floating cart bar */}
            <div className={cn(
                'lg:hidden border-t bg-card px-4 py-3 flex items-center justify-between shrink-0',
                items.length === 0 && 'hidden',
            )}>
                <button
                    onClick={() => setShowCartSheet(true)}
                    className="flex items-center gap-3 flex-1 min-h-[44px]"
                >
                    <div className="relative">
                        <ShoppingCart className="h-5 w-5" />
                        <Badge variant="destructive" className="absolute -top-2 -right-3 h-5 min-w-[1.25rem] p-0 flex items-center justify-center text-[10px]">
                            {items.length}
                        </Badge>
                    </div>
                    <span className="font-medium text-sm ml-2">
                        {items.reduce((sum, i) => sum + i.quantity, 0)} item
                    </span>
                </button>
                <Button
                    onClick={() => {
                        setShowCartSheet(true);
                    }}
                    className="min-h-[44px] px-6 font-semibold"
                >
                    Lihat Keranjang
                </Button>
            </div>

            {/* Mobile/Tablet Cart Bottom Sheet */}
            <Sheet open={showCartSheet} onOpenChange={setShowCartSheet}>
                <SheetContent
                    side="bottom"
                    className="h-[85vh] p-0 rounded-t-2xl"
                >
                    <SheetTitle className="sr-only">Keranjang Belanja</SheetTitle>
                    {/* Drag handle */}
                    <div className="flex justify-center pt-3 pb-1">
                        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
                    </div>
                    {/* Close button */}
                    <div className="absolute right-4 top-3 z-10">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="min-h-[44px] min-w-[44px]"
                            onClick={() => setShowCartSheet(false)}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                    <div className="h-full overflow-hidden">
                        <CartPanel
                            onCheckout={() => {
                                setShowCartSheet(false);
                                setShowPayment(true);
                            }}
                            onHoldBill={() => {
                                setShowCartSheet(false);
                                handleHoldBill();
                            }}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Payment Panel */}
            {showPayment && (
                <PaymentPanel
                    onComplete={handleCheckoutComplete}
                    onCancel={() => {
                        setShowPayment(false);
                        clearPayments();
                    }}
                />
            )}

            {/* Receipt Preview */}
            {receiptData && (
                <ReceiptPreview
                    data={receiptData}
                    open={showReceipt}
                    onClose={() => {
                        setShowReceipt(false);
                        setReceiptData(null);
                    }}
                />
            )}

            {/* Held Bills Panel */}
            <HeldBillsPanel
                bills={heldBills}
                open={showHeldBills}
                onClose={() => setShowHeldBills(false)}
                onResume={handleResumeBill}
                onDelete={removeHeldBill}
            />

            {/* Product Modal */}
            <ProductModal
                product={selectedProduct}
                open={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
            />

            {/* Customer Selector */}
            <CustomerSelector
                open={showCustomerSelector}
                onClose={() => setShowCustomerSelector(false)}
                onSelect={(customer) => {
                    if (customer) {
                        setCustomer(customer.id, customer.name);
                    } else {
                        setCustomer(undefined, undefined);
                    }
                }}
                selectedCustomerId={customerId}
            />

            {/* Table Selector */}
            <TableSelector
                open={showTableSelector}
                onClose={() => setShowTableSelector(false)}
                onSelect={(table) => {
                    if (table) {
                        setTable(table.id, table.name);
                    } else {
                        setTable(undefined, undefined);
                    }
                }}
                selectedTableId={tableId}
                outletId={outletId}
            />

            {/* Discount Modal */}
            <DiscountModal
                open={showDiscountModal}
                onClose={() => setShowDiscountModal(false)}
            />

            {/* Shortcuts Dialog */}
            <ShortcutsDialog
                open={showShortcutHelp}
                onClose={() => setShowShortcutHelp(false)}
            />

            {/* KDS Order Ready Notification */}
            <OrderReadyToast />
        </div>
    );
}
