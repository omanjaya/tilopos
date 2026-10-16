import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { PaymentMethod } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { DocumentNumberService } from '@shared/numbering';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import { sumMoney, toNumber } from '@shared/utils/money';

export interface MergeBillInput {
  transactionIds: string[];
  employeeId: string;
  businessId: string;
  paymentMethod?: PaymentMethod;
}

export interface MergeBillOutput {
  mergedTransactionId: string;
  receiptNumber: string;
  outletId: string;
  grandTotal: number;
}

/**
 * Merges several completed sales of ONE outlet into a single bill (R8/R9).
 *
 * All writes run in one $transaction. The originals are claimed with a
 * conditional update (completed -> split, voidReason "Merged into ...") so a
 * bill can only be merged once. Reports and settlements count only
 * 'completed'/'refunded' transactions, so the originals drop out and the merged
 * bill — which receives their items and payments and the summed subtotal,
 * discount, tax and service charge — is counted exactly once. 'voided' is not
 * used because voiding means "sale did not happen" (stock restoration, void reports).
 */
@Injectable()
export class MergeBillUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentNumbers: DocumentNumberService,
  ) {}

  async execute(input: MergeBillInput): Promise<MergeBillOutput> {
    if (!input.businessId) {
      throw new BusinessError(ErrorCode.INVALID_TRANSACTION, 'Business context required');
    }
    const ids = [...new Set(input.transactionIds)];
    if (ids.length < 2) {
      throw new BusinessError(ErrorCode.INVALID_TRANSACTION, 'Select at least 2 different bills');
    }

    const originals = await this.prisma.transaction.findMany({
      where: { id: { in: ids }, outlet: { businessId: input.businessId } },
      select: {
        id: true,
        outletId: true,
        shiftId: true,
        customerId: true,
        tableId: true,
        orderType: true,
        status: true,
        transactionType: true,
        receiptNumber: true,
        subtotal: true,
        discountAmount: true,
        taxAmount: true,
        serviceCharge: true,
        grandTotal: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    if (originals.length !== ids.length) {
      throw new NotFoundException('One or more transactions not found');
    }
    for (const t of originals) {
      if (t.status !== 'completed' || t.transactionType !== 'sale') {
        throw new BusinessError(
          ErrorCode.INVALID_TRANSACTION,
          `Transaction ${t.receiptNumber} is not a completed sale`,
        );
      }
    }
    const outletId = originals[0].outletId;
    if (originals.some((t) => t.outletId !== outletId)) {
      throw new BusinessError(
        ErrorCode.INVALID_TRANSACTION,
        'Only bills of the same outlet can be merged',
      );
    }

    const same = <K extends 'customerId' | 'tableId' | 'shiftId'>(key: K) =>
      originals.every((t) => t[key] === originals[0][key]) ? originals[0][key] : null;

    const subtotal = sumMoney(originals.map((t) => t.subtotal));
    const discountAmount = sumMoney(originals.map((t) => t.discountAmount));
    const taxAmount = sumMoney(originals.map((t) => t.taxAmount));
    const serviceCharge = sumMoney(originals.map((t) => t.serviceCharge));
    const grandTotal = sumMoney(originals.map((t) => t.grandTotal));

    return this.prisma.$transaction(async (tx) => {
      const receiptNumber = await this.documentNumbers.next(tx, input.businessId, 'MRG');

      const claimed = await tx.transaction.updateMany({
        where: { id: { in: ids }, status: 'completed' },
        data: {
          status: 'split',
          voidReason: `Merged into ${receiptNumber}`,
        },
      });
      if (claimed.count !== ids.length) {
        throw new ConflictException('One or more bills were already merged, split or changed');
      }

      const merged = await tx.transaction.create({
        data: {
          outletId,
          employeeId: input.employeeId,
          customerId: same('customerId'),
          shiftId: same('shiftId') ?? originals[0].shiftId,
          receiptNumber,
          transactionType: 'sale',
          orderType: originals[0].orderType,
          tableId: same('tableId'),
          subtotal,
          discountAmount,
          taxAmount,
          serviceCharge,
          grandTotal,
          notes: `Merged from: ${originals.map((t) => t.receiptNumber).join(', ')}`,
          status: 'completed',
        },
        select: { id: true },
      });

      // Items and payments follow the bill, so product sales and payment totals
      // are counted once (on the merged bill) and a later void/refund covers them.
      await tx.transactionItem.updateMany({
        where: { transactionId: { in: ids } },
        data: { transactionId: merged.id },
      });
      await tx.payment.updateMany({
        where: { transactionId: { in: ids } },
        data: { transactionId: merged.id },
      });

      return {
        mergedTransactionId: merged.id,
        receiptNumber,
        outletId,
        grandTotal: toNumber(grandTotal),
      };
    });
  }
}
