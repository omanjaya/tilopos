import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type PaymentMethod } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { DocumentNumberService } from '@shared/numbering';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import { money, roundRupiah, sumMoney, toNumber } from '@shared/utils/money';

export interface SplitBillInput {
  transactionId: string;
  businessId: string;
  splitType: 'equal' | 'by_item' | 'by_amount';
  splits: {
    customerName?: string;
    itemIds?: string[];
    amount?: number;
    paymentMethod: PaymentMethod;
  }[];
}

export interface SplitBillOutput {
  parentTransactionId: string;
  childTransactions: {
    transactionId: string;
    receiptNumber: string;
    amount: number;
  }[];
}

type Decimal = Prisma.Decimal;

/**
 * Splits `total` into parts proportional to `weights`, rounded to whole rupiah.
 * The last part absorbs rounding so the parts always sum exactly to `total`.
 */
export function allocateProportionally(total: Decimal, weights: Decimal[]): Decimal[] {
  const weightSum = sumMoney(weights);
  if (weightSum.isZero()) {
    return weights.map(() => money(0));
  }
  const parts: Decimal[] = [];
  let allocated = money(0);
  weights.forEach((w, i) => {
    if (i === weights.length - 1) {
      parts.push(total.minus(allocated));
    } else {
      const part = roundRupiah(total.times(w).dividedBy(weightSum));
      parts.push(part);
      allocated = allocated.plus(part);
    }
  });
  return parts;
}

/**
 * Splits a completed sale into N child sales (R8/R9):
 * - the parent is claimed with a conditional update (completed -> split) inside
 *   the same $transaction that creates the children, so a bill can be split once;
 * - subtotal, discount, tax and service charge are prorated over the parts and
 *   always sum exactly to the parent's values;
 * - each child carries its own payment and a DocumentNumberService receipt number;
 * - the parent (status 'split') is excluded from sales reports/settlements, which
 *   only count 'completed' (and 'refunded') transactions, so nothing is counted twice.
 */
@Injectable()
export class SplitBillUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentNumbers: DocumentNumberService,
  ) {}

  async execute(input: SplitBillInput): Promise<SplitBillOutput> {
    if (!input.businessId) {
      throw new BusinessError(ErrorCode.INVALID_TRANSACTION, 'Business context required');
    }

    const parent = await this.prisma.transaction.findFirst({
      where: { id: input.transactionId, outlet: { businessId: input.businessId } },
      include: { items: { select: { id: true, subtotal: true } } },
    });
    if (!parent) {
      throw new NotFoundException(`Transaction ${input.transactionId} not found`);
    }
    if (parent.status !== 'completed' || parent.transactionType !== 'sale') {
      throw new BusinessError(ErrorCode.INVALID_TRANSACTION, 'Only completed sales can be split');
    }

    const splitCount = input.splits.length;
    if (splitCount < 2) {
      throw new BusinessError(ErrorCode.INVALID_TRANSACTION, 'Must split into at least 2 parts');
    }

    const grandTotal = money(parent.grandTotal);
    if (!grandTotal.isPositive()) {
      throw new BusinessError(ErrorCode.INVALID_TRANSACTION, 'Nothing to split');
    }

    const { amounts, itemAssignment } = this.computeParts(input, parent.items, grandTotal);

    const subtotals = allocateProportionally(money(parent.subtotal), amounts);
    const discounts = allocateProportionally(money(parent.discountAmount), amounts);
    const taxes = allocateProportionally(money(parent.taxAmount), amounts);
    const serviceCharges = allocateProportionally(money(parent.serviceCharge), amounts);

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.transaction.updateMany({
        where: { id: parent.id, status: 'completed' },
        data: { status: 'split' },
      });
      if (claimed.count !== 1) {
        throw new ConflictException('Transaction was already split, merged or changed');
      }

      const childTransactions: SplitBillOutput['childTransactions'] = [];
      for (let i = 0; i < splitCount; i++) {
        const split = input.splits[i];
        const receiptNumber = await this.documentNumbers.next(tx, input.businessId, 'SPL');
        const child = await tx.transaction.create({
          data: {
            outletId: parent.outletId,
            employeeId: parent.employeeId,
            customerId: null,
            shiftId: parent.shiftId,
            receiptNumber,
            transactionType: 'sale',
            orderType: parent.orderType,
            tableId: parent.tableId,
            subtotal: subtotals[i],
            discountAmount: discounts[i],
            taxAmount: taxes[i],
            serviceCharge: serviceCharges[i],
            grandTotal: amounts[i],
            notes: split.customerName
              ? `Split ${i + 1}/${splitCount} from ${parent.receiptNumber} (${split.customerName})`
              : `Split ${i + 1}/${splitCount} from ${parent.receiptNumber}`,
            status: 'completed',
            payments: {
              create: [
                { paymentMethod: split.paymentMethod, amount: amounts[i], status: 'completed' },
              ],
            },
          },
          select: { id: true },
        });

        const itemIds = itemAssignment[i];
        if (itemIds.length > 0) {
          await tx.transactionItem.updateMany({
            where: { id: { in: itemIds }, transactionId: parent.id },
            data: { transactionId: child.id },
          });
        }

        childTransactions.push({
          transactionId: child.id,
          receiptNumber,
          amount: toNumber(amounts[i]),
        });
      }

      await tx.transaction.updateMany({
        where: { id: parent.id },
        data: {
          voidReason: `Split into ${childTransactions.map((c) => c.receiptNumber).join(', ')}`,
        },
      });

      return { parentTransactionId: parent.id, childTransactions };
    });
  }

  private computeParts(
    input: SplitBillInput,
    items: { id: string; subtotal: Prisma.Decimal }[],
    grandTotal: Decimal,
  ): { amounts: Decimal[]; itemAssignment: string[][] } {
    const n = input.splits.length;
    const allItemIds = items.map((it) => it.id);

    if (input.splitType === 'equal') {
      const amounts = allocateProportionally(
        grandTotal,
        input.splits.map(() => money(1)),
      );
      // Items cannot be divided: they travel with the first part so product sales stay counted once.
      return { amounts, itemAssignment: input.splits.map((_, i) => (i === 0 ? allItemIds : [])) };
    }

    if (input.splitType === 'by_amount') {
      const amounts = input.splits.map((s) => {
        if (s.amount === undefined || s.amount === null) {
          throw new BusinessError(ErrorCode.INVALID_PAYMENT, 'Every part needs an amount');
        }
        const amount = money(s.amount);
        if (!amount.isPositive()) {
          throw new BusinessError(ErrorCode.INVALID_PAYMENT, 'Split amounts must be positive');
        }
        return amount;
      });
      if (!sumMoney(amounts).equals(grandTotal)) {
        throw new BusinessError(
          ErrorCode.INVALID_PAYMENT,
          `Split amounts must add up exactly to ${grandTotal.toFixed(0)}`,
        );
      }
      return { amounts, itemAssignment: input.splits.map((_, i) => (i === 0 ? allItemIds : [])) };
    }

    // by_item: every item of the bill goes into exactly one part.
    const byId = new Map(items.map((it) => [it.id, it]));
    const seen = new Set<string>();
    const itemAssignment = input.splits.map((s) => {
      const ids = s.itemIds ?? [];
      if (ids.length === 0) {
        throw new BusinessError(
          ErrorCode.INVALID_TRANSACTION,
          'Every part needs at least one item',
        );
      }
      for (const id of ids) {
        if (!byId.has(id)) {
          throw new BusinessError(ErrorCode.INVALID_TRANSACTION, `Item ${id} is not on this bill`);
        }
        if (seen.has(id)) {
          throw new BusinessError(ErrorCode.INVALID_TRANSACTION, `Item ${id} is in two parts`);
        }
        seen.add(id);
      }
      return ids;
    });
    if (seen.size !== items.length) {
      throw new BusinessError(
        ErrorCode.INVALID_TRANSACTION,
        'Every item of the bill must be assigned to a part',
      );
    }
    const weights = itemAssignment.map((ids) =>
      sumMoney(ids.map((id) => byId.get(id)?.subtotal ?? 0)),
    );
    const amounts = allocateProportionally(grandTotal, weights);
    if (amounts.some((a) => !a.isPositive()) || amounts.length !== n) {
      throw new BusinessError(ErrorCode.INVALID_PAYMENT, 'Every part must have a positive amount');
    }
    return { amounts, itemAssignment };
  }
}
