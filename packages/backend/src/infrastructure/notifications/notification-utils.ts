/**
 * Shared helpers for notification delivery (Docs/ENGINEERING-RULES.md R10/R12).
 */

/** Why a delivery did not happen. Never report success when nothing was sent. */
export type DeliveryFailureReason =
  | 'NOT_CONFIGURED'
  | 'NO_RECIPIENT'
  | 'UNSUPPORTED'
  | 'PROVIDER_ERROR';

export interface DeliveryResult {
  success: boolean;
  messageId?: string;
  reason?: DeliveryFailureReason;
  error?: string;
}

/** Timeout for outbound provider HTTP calls. */
export const PROVIDER_TIMEOUT_MS = 10_000;

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
};

/** Escapes text before it is interpolated into HTML (tenant/customer supplied text). */
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/** Masks a phone number for logs: keeps the last 3 digits only. */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '<none>';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 3) return '***';
  return `***${digits.slice(-3)}`;
}

/** Masks an e-mail address for logs: `j***@example.com`. */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '<none>';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 1)}***@${domain}`;
}
