/**
 * Xendit Refund Service
 *
 * Routes a refund to the single API that matches the payment kind recorded in
 * the gateway reference (`<kind>:<id>`). Kinds without an API refund in this
 * integration fail honestly so the refund is handled manually.
 */

import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { RefundResult } from '@domain/interfaces/services';
import { XenditInvoiceService } from './invoice.service';
import { XenditApiError } from './base.service';
import { parseXenditRef } from '../types';

export class XenditRefundService {
  private readonly logger = new Logger(XenditRefundService.name);

  constructor(private readonly invoiceService: XenditInvoiceService) {}

  async processRefund(
    transactionRef: string,
    amount: number,
    _reason?: string,
  ): Promise<RefundResult> {
    const { kind, id } = parseXenditRef(transactionRef);

    if (kind !== 'invoice') {
      this.logger.warn(
        `Refund for ${kind} payment ${id} is not supported via API; manual refund required`,
      );
      return {
        success: false,
        refundRef: '',
        message: `Refunds for ${kind} payments must be processed manually`,
      };
    }

    try {
      const response = await this.invoiceService.refund(id, amount, randomUUID());
      if (response.status === 'FAILED') {
        return { success: false, refundRef: response.id, message: 'Xendit rejected the refund' };
      }
      return {
        success: true,
        refundRef: response.id,
        message:
          response.status === 'SUCCEEDED'
            ? 'Refund succeeded'
            : 'Refund requested (pending at Xendit)',
      };
    } catch (error) {
      const message = error instanceof XenditApiError ? error.message : String(error);
      return { success: false, refundRef: '', message: `Invoice refund failed: ${message}` };
    }
  }
}
