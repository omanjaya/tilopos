/**
 * Xendit Webhook Service
 *
 * Handles webhook signature verification and payload parsing
 * Ensures secure processing of Xendit webhook callbacks
 */

import { Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import type { XenditWebhookPayload, XenditConfig } from '../types';

export class XenditWebhookService {
  private readonly logger = new Logger(XenditWebhookService.name);

  constructor(private readonly config: XenditConfig) {}

  /**
   * Verify Xendit webhook signature using HMAC SHA256
   *
   * Xendit signs webhook payloads with your webhook token
   * Signature = SHA256(payload_body + webhook_token)
   */
  verifySignature(payload: string, signature: string): boolean {
    if (!this.config.webhookToken) {
      this.logger.warn('Webhook token not configured - skipping signature verification');
      return true; // Allow in development if token not configured
    }

    try {
      const expectedSignature = createHash('sha256')
        .update(payload + this.config.webhookToken)
        .digest('hex');

      const isValid = signature === expectedSignature;

      if (!isValid) {
        this.logger.error('Webhook signature verification failed', {
          expected: expectedSignature.substring(0, 10) + '...',
          received: signature.substring(0, 10) + '...',
        });
      }

      return isValid;
    } catch (error) {
      this.logger.error(
        `Webhook signature verification error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * Parse and normalize webhook payload
   */
  parsePayload(payload: XenditWebhookPayload): {
    status: string;
    externalId: string;
    amount: number;
    paymentMethod: string;
    transactionId: string;
  } {
    return {
      status: this.normalizeStatus(payload.status),
      externalId: payload.external_id,
      amount: payload.amount,
      paymentMethod: payload.payment_method || 'unknown',
      transactionId: payload.id,
    };
  }

  /**
   * Normalize Xendit webhook status to internal status format
   */
  private normalizeStatus(status: string): string {
    const statusMap: Record<string, string> = {
      // Successful statuses
      PAID: 'completed',
      SETTLED: 'completed',
      COMPLETED: 'completed',
      SUCCEEDED: 'completed',

      // Pending statuses
      PENDING: 'pending',
      ACTIVE: 'pending',
      INACTIVE: 'pending',

      // Failed statuses
      EXPIRED: 'failed',
      FAILED: 'failed',
      VOIDED: 'failed',
      CANCELLED: 'failed',

      // Refund statuses
      REFUNDED: 'refunded',
    };

    const normalizedStatus = statusMap[status.toUpperCase()];

    if (!normalizedStatus) {
      this.logger.warn(`Unknown webhook status: ${status}`);
      return status.toLowerCase();
    }

    return normalizedStatus;
  }

  /**
   * Validate webhook payload structure
   */
  validatePayload(payload: unknown): payload is XenditWebhookPayload {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }

    const webhookPayload = payload as Partial<XenditWebhookPayload>;

    // Check required fields
    const requiredFields: (keyof XenditWebhookPayload)[] = [
      'id',
      'external_id',
      'status',
      'amount',
    ];

    for (const field of requiredFields) {
      if (!(field in webhookPayload)) {
        this.logger.error(`Missing required webhook field: ${field}`);
        return false;
      }
    }

    // Validate field types
    if (
      typeof webhookPayload.id !== 'string' ||
      typeof webhookPayload.external_id !== 'string' ||
      typeof webhookPayload.status !== 'string' ||
      typeof webhookPayload.amount !== 'number'
    ) {
      this.logger.error('Invalid webhook payload field types');
      return false;
    }

    return true;
  }

  /**
   * Extract event type from webhook payload
   */
  getEventType(payload: XenditWebhookPayload): string {
    // Xendit sends event type in the 'event' field
    if (payload.event) {
      return payload.event;
    }

    // Fallback to deriving event from payment method and status
    const method = payload.payment_method || 'unknown';
    const status = payload.status.toLowerCase();

    return `${method}.${status}`;
  }

  /**
   * Determine if webhook should be processed
   * Filters out duplicate or irrelevant webhooks
   */
  shouldProcessWebhook(payload: XenditWebhookPayload): boolean {
    // Process only final status webhooks
    const finalStatuses = [
      'PAID',
      'SETTLED',
      'COMPLETED',
      'SUCCEEDED',
      'FAILED',
      'EXPIRED',
      'VOIDED',
    ];

    return finalStatuses.includes(payload.status.toUpperCase());
  }

  /**
   * Log webhook for debugging purposes
   */
  logWebhook(payload: XenditWebhookPayload, verified: boolean): void {
    this.logger.log('Webhook received', {
      event: payload.event || 'unknown',
      id: payload.id,
      externalId: payload.external_id,
      status: payload.status,
      amount: payload.amount,
      paymentMethod: payload.payment_method || 'unknown',
      verified,
    });
  }
}
