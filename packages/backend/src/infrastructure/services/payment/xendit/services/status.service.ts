/**
 * Xendit Status Service
 *
 * Checks a payment's status with the one API matching the kind recorded in the
 * gateway reference (`<kind>:<id>`). API failures propagate (never reported as
 * 'pending'), so reconciliation can tell "unpaid" from "could not check".
 */

import type { PaymentStatus } from '@domain/interfaces/services';
import { XenditQRISService } from './qris.service';
import { XenditVirtualAccountService } from './virtual-account.service';
import { XenditEwalletService } from './ewallet.service';
import { XenditInvoiceService } from './invoice.service';
import { XenditRetailService } from './retail.service';
import { parseXenditRef } from '../types';

export class XenditStatusService {
  constructor(
    private readonly qrisService: XenditQRISService,
    private readonly vaService: XenditVirtualAccountService,
    private readonly ewalletService: XenditEwalletService,
    private readonly invoiceService: XenditInvoiceService,
    private readonly retailService: XenditRetailService,
  ) {}

  async checkStatus(transactionRef: string): Promise<PaymentStatus> {
    const { kind, id } = parseXenditRef(transactionRef);
    switch (kind) {
      case 'invoice':
        return this.invoiceService.getStatus(id);
      case 'qris':
        return this.qrisService.getStatus(id);
      case 'va':
        return this.vaService.getStatus(id);
      case 'ewallet':
        return this.ewalletService.getStatus(id);
      case 'retail':
        return this.retailService.getStatus(id);
    }
  }
}
