import { useCallback, useMemo } from 'react';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import type { KeyboardShortcut } from '@/hooks/use-keyboard-shortcuts';

interface POSShortcutHandlers {
    onFocusSearch: () => void;
    onToggleViewMode: () => void;
    onOpenCustomerSelector: () => void;
    onOpenTableSelector: () => void;
    onHoldBill: () => void;
    onResumeHeldBill: () => void;
    onOpenDiscountModal: () => void;
    onProcessPayment: () => void;
    onPrintReceipt: () => void;
    onOpenShortcutHelp: () => void;
    onCloseModal: () => void;
    onConfirmAction: () => void;
    onQuickCashCheckout?: () => void;
}

export function usePOSShortcuts(handlers: POSShortcutHandlers) {
    const {
        onFocusSearch,
        onToggleViewMode,
        onOpenCustomerSelector,
        onOpenTableSelector,
        onHoldBill,
        onResumeHeldBill,
        onOpenDiscountModal,
        onProcessPayment,
        onPrintReceipt,
        onOpenShortcutHelp,
        onCloseModal,
        onConfirmAction,
        onQuickCashCheckout,
    } = handlers;

    const handleF1 = useCallback(() => onFocusSearch(), [onFocusSearch]);
    const handleF2 = useCallback(() => onToggleViewMode(), [onToggleViewMode]);
    const handleF3 = useCallback(() => onOpenCustomerSelector(), [onOpenCustomerSelector]);
    const handleF4 = useCallback(() => onOpenTableSelector(), [onOpenTableSelector]);
    const handleF5 = useCallback(() => onHoldBill(), [onHoldBill]);
    const handleF6 = useCallback(() => onResumeHeldBill(), [onResumeHeldBill]);
    const handleF7 = useCallback(() => onOpenDiscountModal(), [onOpenDiscountModal]);
    const handleF8 = useCallback(() => onProcessPayment(), [onProcessPayment]);
    const handleF9 = useCallback(() => onPrintReceipt(), [onPrintReceipt]);
    const handleF10 = useCallback(() => onOpenShortcutHelp(), [onOpenShortcutHelp]);
    const handleEscape = useCallback(() => onCloseModal(), [onCloseModal]);
    const handleEnter = useCallback(() => onConfirmAction(), [onConfirmAction]);
    const handleF12 = useCallback(() => onQuickCashCheckout?.(), [onQuickCashCheckout]);

    const shortcuts: KeyboardShortcut[] = useMemo(
        () => [
            { key: 'F1', handler: handleF1 },
            { key: 'F2', handler: handleF2 },
            { key: 'F3', handler: handleF3 },
            { key: 'F4', handler: handleF4 },
            { key: 'F5', handler: handleF5 },
            { key: 'F6', handler: handleF6 },
            { key: 'F7', handler: handleF7 },
            { key: 'F8', handler: handleF8 },
            { key: 'F9', handler: handleF9 },
            { key: 'F10', handler: handleF10 },
            { key: 'Escape', handler: handleEscape },
            { key: 'Enter', handler: handleEnter, allowInInput: false },
            { key: 'F12', handler: handleF12 },
        ],
        [
            handleF1, handleF2, handleF3, handleF4,
            handleF5, handleF6, handleF7, handleF8,
            handleF9, handleF10, handleEscape, handleEnter,
            handleF12,
        ],
    );

    useKeyboardShortcuts({ shortcuts });
}

export interface ShortcutEntry {
    key: string;
    description: string;
}

export const POS_SHORTCUTS: ShortcutEntry[] = [
    { key: 'F1', description: 'Fokus pencarian' },
    { key: 'F2', description: 'Ganti tampilan grid/list' },
    { key: 'F3', description: 'Pilih pelanggan' },
    { key: 'F4', description: 'Pilih meja' },
    { key: 'F5', description: 'Tahan pesanan saat ini' },
    { key: 'F6', description: 'Buka pesanan tertahan' },
    { key: 'F7', description: 'Diskon' },
    { key: 'F8', description: 'Proses pembayaran' },
    { key: 'F9', description: 'Cetak struk terakhir' },
    { key: 'F10', description: 'Tampilkan pintasan keyboard' },
    { key: 'Esc', description: 'Tutup modal/dialog' },
    { key: 'Enter', description: 'Konfirmasi aksi pada modal aktif' },
    { key: 'F12', description: 'Bayar tunai uang pas' },
];
