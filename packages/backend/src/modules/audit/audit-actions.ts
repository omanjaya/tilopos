/**
 * Audit log action names that are actually written by the application.
 * Detectors and summaries must reference these constants, never ad-hoc strings,
 * so a renamed action cannot silently disable detection.
 *
 * Writers: void-transaction.use-case.ts (TRANSACTION_VOIDED),
 * process-refund.use-case.ts (TRANSACTION_REFUNDED, newValue.refundAmount),
 * transaction-event.listener.ts (TRANSACTION_CREATED), cash-in/cash-out use-cases.
 */
export const AUDIT_ACTIONS = {
  TRANSACTION_CREATED: 'transaction_created',
  TRANSACTION_VOIDED: 'transaction_voided',
  TRANSACTION_REFUNDED: 'transaction_refunded',
  CASH_IN: 'cash_in',
  CASH_OUT: 'cash_out',
  ORDER_STATUS_CHANGED: 'order_status_changed',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
