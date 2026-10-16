import { describe, expect, it } from 'vitest';
import { CASH_ONLY, toPaymentOptions } from './payment-options';

describe('toPaymentOptions', () => {
    it('maps active methods, splits card into debit/credit and puts cash first', () => {
        const options = toPaymentOptions([
            { id: '1', name: 'QRIS', type: 'qris', processingFee: 0.7, method: 'qris' },
            { id: '2', name: 'Kartu', type: 'card', processingFee: 2.5, method: 'card' },
            { id: '3', name: 'Tunai', type: 'cash', processingFee: 0, method: 'cash' },
            { id: '4', name: 'Dompet X', type: 'ewallet', processingFee: 0, method: null },
            { id: '5', name: 'GoPay', type: 'ewallet', processingFee: 2, method: 'gopay' },
        ]);
        expect(options.map((o) => o.id)).toEqual(['cash', 'qris', 'debit_card', 'credit_card', 'gopay']);
        expect(options.find((o) => o.id === 'gopay')?.name).toBe('GoPay');
    });

    it('falls back to cash when nothing usable is configured', () => {
        expect(toPaymentOptions([])).toEqual(CASH_ONLY);
    });
});
