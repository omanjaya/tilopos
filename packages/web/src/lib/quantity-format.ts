/**
 * Format quantity for display, supporting decimals when enabled.
 * Removes trailing zeros: 4.500 -> "4.5", 3.000 -> "3"
 */
export function formatQuantity(qty: number, allowDecimal: boolean): string {
    if (!allowDecimal) return String(Math.round(qty));
    if (qty % 1 === 0) return String(qty);
    return qty.toFixed(3).replace(/0+$/, '');
}
