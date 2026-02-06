import { useState, useCallback } from 'react';
import type { POSProduct, ReceiptData } from '@/types/pos.types';

/**
 * Hook for managing all POS modal states
 */
export function usePosModals() {
    const [showPayment, setShowPayment] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [showHeldBills, setShowHeldBills] = useState(false);
    const [showCustomerSelector, setShowCustomerSelector] = useState(false);
    const [showTableSelector, setShowTableSelector] = useState(false);
    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [showShortcutHelp, setShowShortcutHelp] = useState(false);
    const [showCartSheet, setShowCartSheet] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<POSProduct | null>(null);
    const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

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

    return {
        // Payment modal
        showPayment,
        setShowPayment,
        openPayment: () => setShowPayment(true),
        closePayment: () => setShowPayment(false),

        // Receipt modal
        showReceipt,
        setShowReceipt,
        receiptData,
        setReceiptData,
        openReceipt: (data: ReceiptData) => {
            setReceiptData(data);
            setShowReceipt(true);
        },
        closeReceipt: () => {
            setShowReceipt(false);
            setReceiptData(null);
        },

        // Held bills modal
        showHeldBills,
        setShowHeldBills,
        openHeldBills: () => setShowHeldBills(true),
        closeHeldBills: () => setShowHeldBills(false),

        // Customer selector modal
        showCustomerSelector,
        setShowCustomerSelector,
        openCustomerSelector: () => setShowCustomerSelector(true),
        closeCustomerSelector: () => setShowCustomerSelector(false),

        // Table selector modal
        showTableSelector,
        setShowTableSelector,
        openTableSelector: () => setShowTableSelector(true),
        closeTableSelector: () => setShowTableSelector(false),

        // Discount modal
        showDiscountModal,
        setShowDiscountModal,
        openDiscountModal: () => setShowDiscountModal(true),
        closeDiscountModal: () => setShowDiscountModal(false),

        // Shortcut help modal
        showShortcutHelp,
        setShowShortcutHelp,
        openShortcutHelp: () => setShowShortcutHelp(true),
        closeShortcutHelp: () => setShowShortcutHelp(false),

        // Cart sheet (mobile)
        showCartSheet,
        setShowCartSheet,
        openCartSheet: () => setShowCartSheet(true),
        closeCartSheet: () => setShowCartSheet(false),

        // Product modal
        selectedProduct,
        setSelectedProduct,
        openProductModal: (product: POSProduct) => setSelectedProduct(product),
        closeProductModal: () => setSelectedProduct(null),

        // Utility
        closeAllModals,
    };
}
