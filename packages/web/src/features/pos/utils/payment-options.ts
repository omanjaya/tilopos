import type { POSPaymentMethodConfig } from '@/api/endpoints/pos.api';
import type { PaymentMethod } from '@/types/pos.types';

export type PaymentOptionKind = 'cash' | 'card' | 'ewallet' | 'qris' | 'bank_transfer';

/** A payment button of the POS payment panel. */
export interface PaymentOption {
    id: PaymentMethod;
    name: string;
    kind: PaymentOptionKind;
}

/** Offered while the configuration is loading or could not be loaded. */
export const CASH_ONLY: PaymentOption[] = [{ id: 'cash', name: 'Tunai', kind: 'cash' }];

/**
 * Turns the business' active payment methods into POS buttons. A generic "card" method
 * is split into debit and credit (recorded separately in reports); methods the POS cannot
 * record (method null) are skipped, and duplicates keep the first entry.
 */
export function toPaymentOptions(configs: POSPaymentMethodConfig[]): PaymentOption[] {
    const options: PaymentOption[] = [];
    const seen = new Set<PaymentMethod>();
    const push = (option: PaymentOption) => {
        if (seen.has(option.id)) return;
        seen.add(option.id);
        options.push(option);
    };
    for (const c of configs) {
        if (!c.method) continue;
        if (c.method === 'card') {
            push({ id: 'debit_card', name: 'Debit', kind: 'card' });
            push({ id: 'credit_card', name: 'Kredit', kind: 'card' });
            continue;
        }
        push({ id: c.method, name: c.name, kind: c.type });
    }
    // Cash first: it is the default selection of the panel
    options.sort((a, b) => Number(b.id === 'cash') - Number(a.id === 'cash'));
    return options.length > 0 ? options : CASH_ONLY;
}
