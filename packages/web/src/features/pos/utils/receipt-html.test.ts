import { describe, it, expect } from 'vitest';
import { buildReceiptHtml } from './receipt-html';
import { escapeHtml } from './print-html';
import type { ReceiptData } from '@/types/pos.types';

const receipt: ReceiptData = {
    transaction: {
        id: 't1',
        transactionNumber: 'OFF-001',
        outletId: 'o1',
        employeeId: 'e1',
        orderType: 'takeaway',
        status: 'completed',
        subtotal: 30000,
        discountAmount: 0,
        taxAmount: 3300,
        serviceCharge: 0,
        total: 33300,
        paidAmount: 50000,
        changeAmount: 16700,
        items: [
            {
                id: 'i1',
                productId: 'p1',
                productName: 'Kopi <b>Susu</b>',
                quantity: 2,
                unitPrice: 15000,
                subtotal: 30000,
                discountAmount: 0,
                modifiers: [],
            },
        ],
        payments: [
            { id: 'pay1', method: 'cash', amount: 50000, status: 'completed', createdAt: '2026-09-27T03:00:00Z' },
        ],
        createdAt: '2026-09-27T03:00:00Z',
    },
    business: { name: 'Toko A', address: 'Jl. X', phone: '0812' },
    outlet: { name: 'Outlet 1', address: 'Jl. Y', phone: '0813' },
    employee: { name: 'Kasir' },
    table: { name: 'Meja 5' },
};

describe('buildReceiptHtml', () => {
    it('renders the receipt from local data with escaped content', () => {
        const html = buildReceiptHtml(receipt);
        expect(html).toContain('OFF-001');
        expect(html).toContain('Kopi &lt;b&gt;Susu&lt;/b&gt;');
        expect(html).not.toContain('<b>Susu</b>');
        expect(html).toContain('Tunai');
        expect(html).toContain('Kembalian');
    });

    it('shows the table only when requested', () => {
        expect(buildReceiptHtml(receipt)).not.toContain('Meja 5');
        expect(buildReceiptHtml(receipt, { showTable: true })).toContain('Meja 5');
    });

    it('applies the outlet receipt template and shows cash rounding', () => {
        const html = buildReceiptHtml(
            { ...receipt, transaction: { ...receipt.transaction, roundingAmount: 200, total: 33500 } },
            {
                template: {
                    showLogo: false,
                    showAddress: false,
                    showPhone: false,
                    showTaxBreakdown: false,
                    showPaymentMethod: false,
                    headerText: 'Selamat datang\n<i>Promo</i>',
                    footerText: 'Sampai jumpa',
                    paperSize: '80mm',
                },
            },
        );
        expect(html).not.toContain('Jl. Y');
        expect(html).not.toContain('Telp:');
        expect(html).not.toContain('Pajak');
        expect(html).not.toContain('Tunai');
        expect(html).toContain('Dibayar');
        expect(html).toContain('Selamat datang');
        expect(html).toContain('&lt;i&gt;Promo&lt;/i&gt;');
        expect(html).toContain('Sampai jumpa');
        expect(html).not.toContain('Terima Kasih!');
        expect(html).toContain('Pembulatan');
    });
});

describe('escapeHtml', () => {
    it('escapes html special characters', () => {
        expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
    });
});
