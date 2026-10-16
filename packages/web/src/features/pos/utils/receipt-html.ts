import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { formatCurrency } from '@/lib/format';
import type { ReceiptData } from '@/types/pos.types';
import type { ReceiptTemplate } from '@/types/settings.types';

export interface ReceiptRenderOptions {
    showTable?: boolean;
    /** Outlet receipt template (GET /settings/pos/receipt); defaults show everything. */
    template?: ReceiptTemplate | null;
}

/** Splits a multi-line template text into trimmed, non-empty lines. */
export function templateLines(text: string | undefined | null): string[] {
    return (text ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}
import { escapeHtml, printHtml } from './print-html';

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
    cash: 'Tunai',
    card: 'Kartu',
    qris: 'QRIS',
    bank_transfer: 'Transfer Bank',
    debit_card: 'Kartu Debit',
    credit_card: 'Kartu Kredit',
    gopay: 'GoPay',
    ovo: 'OVO',
    dana: 'DANA',
    shopeepay: 'ShopeePay',
    linkaja: 'LinkAja',
    credit: 'Kredit / Tempo',
};

const row = (left: string, right: string, cls = '') =>
    `<tr class="${cls}"><td>${left}</td><td class="right">${right}</td></tr>`;

/**
 * Build an 80mm thermal-style receipt from ReceiptData only (no network), so it
 * can be printed for offline sales as well as for server receipts/reprints.
 */
export function buildReceiptHtml(data: ReceiptData, options: ReceiptRenderOptions = {}): string {
    const t = options.template;
    const showAddress = t?.showAddress ?? true;
    const showPhone = t?.showPhone ?? true;
    const showTax = t?.showTaxBreakdown ?? true;
    const showPaymentMethod = t?.showPaymentMethod ?? true;
    const header = templateLines(t?.headerText);
    const footer = templateLines(t?.footerText);
    const { transaction: tx, business, outlet, employee, customer, table } = data;
    const e = (v: string | undefined | null) => escapeHtml(v ?? '');
    const created = new Date(tx.createdAt);
    const totalPaid = tx.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const change = tx.changeAmount ?? Math.max(0, totalPaid - tx.total);

    const items = tx.items
        .map((item) => {
            const name = `${item.quantity}x ${e(item.productName)}${item.variantName ? ` (${e(item.variantName)})` : ''}`;
            const mods = (item.modifiers ?? [])
                .map((m) => row(`&nbsp;&nbsp;+ ${e(m.name)}`, formatCurrency(m.price)))
                .join('');
            const notes = item.notes ? `<tr><td colspan="2">&nbsp;&nbsp;Catatan: ${e(item.notes)}</td></tr>` : '';
            return row(name, formatCurrency(item.subtotal)) + mods + notes;
        })
        .join('');

    const payments = showPaymentMethod
        ? tx.payments
              .map((p) => row(e(PAYMENT_METHOD_LABELS[p.method] ?? p.method), formatCurrency(p.amount)))
              .join('')
        : row('Dibayar', formatCurrency(totalPaid));
    const rounding = tx.roundingAmount ?? 0;
    const centered = (lines: string[]) => lines.map((l) => `<div class="center">${e(l)}</div>`).join('');

    return `
<div class="center bold">${e(business.name)}</div>
<div class="center">${e(outlet.name)}</div>
${showAddress && outlet.address ? `<div class="center">${e(outlet.address)}</div>` : ''}
${showPhone && outlet.phone ? `<div class="center">Telp: ${e(outlet.phone)}</div>` : ''}
${business.taxId ? `<div class="center">NPWP: ${e(business.taxId)}</div>` : ''}
${centered(header)}
<hr/>
<table>
${row('No. Transaksi', e(tx.transactionNumber))}
${row('Tanggal', format(created, 'dd/MM/yyyy HH:mm', { locale: idLocale }))}
${row('Kasir', e(employee.name))}
${customer ? row('Pelanggan', e(customer.name)) : ''}
${options.showTable && table ? row('Meja', e(table.name)) : ''}
</table>
<hr/>
<table>${items}</table>
<hr/>
<table>
${row('Subtotal', formatCurrency(tx.subtotal))}
${tx.discountAmount > 0 ? row('Diskon', `-${formatCurrency(tx.discountAmount)}`) : ''}
${showTax && tx.serviceCharge > 0 ? row('Biaya Layanan', formatCurrency(tx.serviceCharge)) : ''}
${showTax && tx.taxAmount > 0 ? row('Pajak', formatCurrency(tx.taxAmount)) : ''}
${rounding !== 0 ? row('Pembulatan', formatCurrency(rounding)) : ''}
${row('TOTAL', formatCurrency(tx.total), 'bold')}
</table>
<hr/>
<table>
${payments}
${change > 0 ? row('Kembalian', formatCurrency(change), 'bold') : ''}
</table>
<hr/>
${footer.length > 0 ? centered(footer) : '<div class="center bold">Terima Kasih!</div>'}
<div class="center">*** Simpan struk ini sebagai bukti pembayaran ***</div>`;
}

/** Print a receipt through a dedicated print document (works offline). */
export function printReceipt(data: ReceiptData, options: ReceiptRenderOptions = {}): void {
    printHtml(buildReceiptHtml(data, options), `Struk ${data.transaction.transactionNumber}`);
}
