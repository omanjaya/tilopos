const QTY_FORMAT = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 });

/**
 * Format quantity for display, supporting decimals when enabled.
 * Uses id-ID separators like the rest of the UI: 4.5 -> "4,5", 3 -> "3"
 */
export function formatQuantity(qty: number, allowDecimal: boolean): string {
    return QTY_FORMAT.format(allowDecimal ? qty : Math.round(qty));
}
