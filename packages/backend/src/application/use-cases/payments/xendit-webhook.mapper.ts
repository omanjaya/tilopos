import type { XenditWebhookDto } from '../../dtos/xendit-webhook.dto';
import type { WebhookOutcome } from './payment-webhook.processor';

/** Route the callback arrived on (each Xendit product posts to its own URL). */
export type XenditWebhookRoute = 'generic' | 'invoice' | 'qris' | 'va' | 'ewallet' | 'retail';

export interface NormalizedXenditWebhook {
  event: string;
  /** Our reference (Payment id) or a stored gateway reference (`<kind>:<id>`). */
  reference: string;
  outcome: WebhookOutcome;
  amount: number | string | null;
  gatewayRef: string | null;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);
const num = (v: unknown): number | string | null =>
  typeof v === 'number' || (typeof v === 'string' && v !== '') ? v : null;

const PAID = new Set(['PAID', 'SETTLED', 'COMPLETED', 'SUCCEEDED', 'CAPTURED', 'SETTLING']);
const FAILED = new Set(['EXPIRED', 'FAILED', 'VOIDED', 'CANCELLED']);

function statusOutcome(status: string | null): WebhookOutcome {
  const s = (status ?? '').toUpperCase();
  if (PAID.has(s)) return 'completed';
  if (FAILED.has(s)) return 'failed';
  if (s === 'REFUNDED') return 'refunded';
  return 'pending';
}

/**
 * Normalizes the different Xendit callback shapes into one notification.
 * Returns null for callbacks that carry no payment state change we track
 * (e.g. VA created/updated). NOTE: shapes follow the public Xendit docs and are
 * not verified against a sandbox.
 */
export function normalizeXenditWebhook(
  route: XenditWebhookRoute,
  body: XenditWebhookDto,
): NormalizedXenditWebhook | null {
  const event = (body.event ?? '').toLowerCase();
  const data = body.data && typeof body.data === 'object' ? body.data : null;

  // --- Envelope style: { event, data: {...} } -------------------------------
  if (data) {
    const dataStatus = str(data.status);
    if (event.startsWith('refund.')) {
      const invoiceId = str(data.invoice_id);
      if (!invoiceId) return null;
      return {
        event,
        reference: `invoice:${invoiceId}`,
        outcome: event === 'refund.succeeded' ? 'refunded' : 'pending',
        amount: num(data.amount),
        gatewayRef: str(data.id),
      };
    }
    if (event.startsWith('ewallet.')) {
      const chargeId = str(data.id);
      return {
        event,
        reference: str(data.reference_id) ?? (chargeId ? `ewallet:${chargeId}` : ''),
        outcome:
          event === 'ewallet.refund'
            ? 'refunded'
            : event === 'ewallet.void'
              ? 'failed'
              : statusOutcome(dataStatus),
        amount: num(data.capture_amount) ?? num(data.charge_amount) ?? num(data.refund_amount),
        gatewayRef: chargeId,
      };
    }
    // QR v2 ('qr.payment') and payment requests ('payment.succeeded' / 'payment.failed').
    return {
      event,
      reference: str(data.reference_id) ?? str(data.external_id) ?? '',
      outcome:
        event === 'payment.failed' ? 'failed' : statusOutcome(dataStatus ?? str(body.status)),
      amount: num(data.amount),
      gatewayRef: str(data.id),
    };
  }

  // --- Legacy QR callback: { event: 'qr.payment', qr_code: { external_id }, status, amount }
  if (body.qr_code && typeof body.qr_code === 'object') {
    return {
      event: event || 'qr.payment',
      reference: str(body.qr_code.external_id) ?? '',
      outcome: statusOutcome(str(body.status) ?? 'COMPLETED'),
      amount: num(body.amount),
      gatewayRef: str(body.id),
    };
  }

  // --- Fixed VA payment callback: flat, no status, has payment_id -----------
  if (route === 'va' || body.callback_virtual_account_id) {
    if (!body.payment_id) return null; // VA created/updated notification
    return {
      event: event || 'va.payment',
      reference: str(body.external_id) ?? '',
      outcome: 'completed',
      amount: num(body.amount),
      gatewayRef: str(body.payment_id),
    };
  }

  // --- Retail (fixed payment code) payment callback -------------------------
  if (route === 'retail' || body.fixed_payment_code_id) {
    return {
      event: event || 'retail.payment',
      reference: str(body.external_id) ?? '',
      outcome: statusOutcome(str(body.status)),
      amount: num(body.amount),
      gatewayRef: str(body.payment_id) ?? str(body.id),
    };
  }

  // --- Invoice callback (flat, no event) ------------------------------------
  const outcome = statusOutcome(str(body.status));
  return {
    event: event || `invoice.${(body.status ?? 'unknown').toLowerCase()}`,
    reference: str(body.external_id) ?? '',
    outcome,
    amount:
      outcome === 'completed' ? (num(body.paid_amount) ?? num(body.amount)) : num(body.amount),
    gatewayRef: str(body.id),
  };
}
