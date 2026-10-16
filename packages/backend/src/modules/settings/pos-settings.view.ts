import type {
  BusinessPaymentMethod,
  OutletReceiptTemplate,
} from '../../domain/interfaces/repositories/settings.repository';
import type { POS_PAYMENT_METHODS } from '../../application/dtos/transaction.dto';

type PosPaymentMethodValue = (typeof POS_PAYMENT_METHODS)[number];

/** Active payment method as the POS needs it (no gateway settings). */
export interface PosPaymentMethodView {
  id: string;
  name: string;
  type: BusinessPaymentMethod['type'];
  processingFee: number;
  /**
   * Value to send as `payments[].method` of POST /pos/transactions. `card` means the POS
   * may offer debit_card/credit_card. null = an e-wallet whose name matches no supported
   * wallet (the POS cannot record it).
   */
  method: PosPaymentMethodValue | null;
}

const EWALLETS: readonly PosPaymentMethodValue[] = ['gopay', 'ovo', 'dana', 'shopeepay', 'linkaja'];

export function toPosPaymentMethodValue(m: BusinessPaymentMethod): PosPaymentMethodValue | null {
  switch (m.type) {
    case 'cash':
    case 'card':
    case 'qris':
    case 'bank_transfer':
      return m.type;
    case 'ewallet': {
      const key = m.name.toLowerCase().replace(/[^a-z]/g, '');
      return EWALLETS.find((w) => key.includes(w)) ?? null;
    }
    default:
      return null;
  }
}

/** Active methods only, without the free-form `settings` object (may hold gateway config). */
export function toPosPaymentMethods(methods: BusinessPaymentMethod[]): PosPaymentMethodView[] {
  return methods
    .filter((m) => m.isActive)
    .map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      processingFee: m.processingFee,
      method: toPosPaymentMethodValue(m),
    }));
}

/** Receipt template of an outlet, read-only for the POS. */
export type PosReceiptTemplateView = OutletReceiptTemplate;
