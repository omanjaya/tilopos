import { Injectable, Logger } from '@nestjs/common';
import { Prisma, type PaymentMethod } from '@prisma/client';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { TransactionCreatedEvent } from '@domain/events/transaction-created.event';
import { StockLevelChangedEvent } from '@domain/events/stock-level-changed.event';
import { AppError } from '@shared/errors/app-error';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import { ROLE_HIERARCHY } from '@shared/constants/roles';
import { DocumentNumberService } from '@shared/numbering';
import { TenantAccessService } from '@shared/tenant';
import { money, sumMoney, toNumber } from '@shared/utils/money';
import {
  SalePricingService,
  type PricedSale,
  type SaleDiscountInput,
  type SaleLineInput,
} from '../../services/sale-pricing.service';
import { PromotionRulesEngine } from '../../services/promotion-rules.engine';
import { applyStockChanges, type StockChange } from '../../services/sale-stock';
import { computeLoyaltyPoints } from '../../services/loyalty-points';

export type TransactionItemInput = SaleLineInput;
export type DiscountInput = SaleDiscountInput;

export interface PaymentInput {
  method: string;
  amount: number;
  referenceNumber?: string;
}

export interface CreateTransactionInput {
  businessId: string;
  outletId: string;
  employeeId: string;
  /** Caller role: gates price overrides and manual discount caps (R8). */
  role: string;
  customerId?: string;
  shiftId: string;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  tableId?: string;
  items: TransactionItemInput[];
  payments: PaymentInput[];
  discounts?: DiscountInput[];
  notes?: string;
  /** Client idempotency key (offline sync / retries). Unique per outlet. */
  clientTransactionId?: string;
  /** When the sale happened on the device (offline sync). */
  occurredAt?: Date;
}

export interface CreateTransactionOutput {
  transactionId: string;
  receiptNumber: string;
  grandTotal: number;
  roundingAmount: number;
  change: number;
  loyaltyPointsEarned: number;
  /** True when an earlier submission with the same clientTransactionId was returned. */
  duplicate?: boolean;
}

/** Maximum age of an offline sale that may still be synced. */
export const MAX_OFFLINE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** Tolerated device clock skew into the future. */
export const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

/** Payment methods recorded by the cashier from an external terminal (EDC / static QRIS / transfer). */
const MANUAL_METHODS: ReadonlySet<string> = new Set([
  'cash',
  'card',
  'debit_card',
  'credit_card',
  'gopay',
  'ovo',
  'dana',
  'shopeepay',
  'linkaja',
  'qris',
  'bank_transfer',
]);

@Injectable()
export class CreateTransactionUseCase {
  private readonly logger = new Logger(CreateTransactionUseCase.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
    private readonly pricing: SalePricingService,
    private readonly promotionRules: PromotionRulesEngine,
    private readonly documentNumbers: DocumentNumberService,
    private readonly tenant: TenantAccessService,
  ) {}

  /** Server-side totals for a cart without creating anything (POS preview). */
  async preview(
    input: Pick<
      CreateTransactionInput,
      'businessId' | 'outletId' | 'role' | 'customerId' | 'orderType' | 'items' | 'discounts'
    > & { payments?: PaymentInput[] },
  ): Promise<PricedSale> {
    await this.tenant.assertOwned('customer', input.customerId, input.businessId);
    return this.pricing.priceSale(
      {
        businessId: input.businessId,
        outletId: input.outletId,
        role: input.role,
        customerId: input.customerId ?? null,
        orderType: input.orderType,
        applyCashRounding: this.isCashOnly(input.payments),
      },
      input.items,
      input.discounts ?? [],
    );
  }

  async execute(input: CreateTransactionInput): Promise<CreateTransactionOutput> {
    const occurredAt = this.resolveOccurredAt(input.occurredAt);

    // Idempotent replay: the same device submission returns the original sale.
    if (input.clientTransactionId) {
      const existing = await this.findByClientId(input.outletId, input.clientTransactionId);
      if (existing) return existing;
    }

    await this.assertReferences(input);
    this.assertPaymentMethods(input.payments);

    const priced = await this.pricing.priceSale(
      {
        businessId: input.businessId,
        outletId: input.outletId,
        role: input.role,
        customerId: input.customerId ?? null,
        orderType: input.orderType,
        applyCashRounding: this.isCashOnly(input.payments),
        now: occurredAt,
      },
      input.items,
      input.discounts ?? [],
    );

    const grandTotal = priced.grandTotal;
    const totalPayments = sumMoney(input.payments.map((p) => p.amount));
    if (totalPayments.lt(grandTotal)) {
      throw new BusinessError(
        ErrorCode.INVALID_PAYMENT,
        `Payment total ${totalPayments.toString()} is less than grand total ${grandTotal.toString()}`,
      );
    }
    // Change can only be given from cash.
    const change = totalPayments.minus(grandTotal);
    const cashPaid = sumMoney(
      input.payments.filter((p) => p.method === 'cash').map((p) => p.amount),
    );
    if (change.gt(cashPaid)) {
      throw new BusinessError(
        ErrorCode.INVALID_PAYMENT,
        'Non-cash payments cannot exceed the grand total (change is only given in cash)',
      );
    }

    let result: { txn: { id: string; receiptNumber: string }; stockChanges: StockChange[] };
    try {
      result = await this.prisma.$transaction((tx) => this.persist(tx, input, priced, occurredAt));
    } catch (error) {
      // Lost a race against a concurrent submission with the same idempotency key.
      if (
        input.clientTransactionId &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.findByClientId(input.outletId, input.clientTransactionId);
        if (existing) return existing;
      }
      throw error;
    }

    this.eventBus.publish(
      new TransactionCreatedEvent(
        result.txn.id,
        input.outletId,
        grandTotal.toNumber(),
        input.customerId || null,
      ),
    );
    for (const sc of result.stockChanges) {
      this.eventBus.publish(
        new StockLevelChangedEvent(
          input.outletId,
          sc.productId,
          sc.variantId,
          sc.previousQty,
          sc.newQty,
        ),
      );
    }

    // KDS orders are created by TransactionToOrderHandler from TransactionCreatedEvent.

    return {
      transactionId: result.txn.id,
      receiptNumber: result.txn.receiptNumber,
      grandTotal: grandTotal.toNumber(),
      roundingAmount: priced.roundingAmount.toNumber(),
      change: change.toNumber(),
      loyaltyPointsEarned: await this.estimateLoyaltyPoints(input, grandTotal),
    };
  }

  // ---------------------------------------------------------------------------

  private async persist(
    tx: Prisma.TransactionClient,
    input: CreateTransactionInput,
    priced: PricedSale,
    occurredAt: Date,
  ) {
    const receiptNumber = await this.documentNumbers.next(tx, input.businessId, 'TXN', {
      date: occurredAt,
    });

    const txn = await tx.transaction.create({
      data: {
        outletId: input.outletId,
        employeeId: input.employeeId,
        customerId: input.customerId || null,
        shiftId: input.shiftId,
        receiptNumber,
        transactionType: 'sale',
        orderType: input.orderType,
        tableId: input.tableId || null,
        subtotal: priced.subtotal,
        discountAmount: priced.discountAmount,
        taxAmount: priced.taxAmount,
        serviceCharge: priced.serviceCharge,
        roundingAmount: priced.roundingAmount,
        grandTotal: priced.grandTotal,
        notes: input.notes || null,
        status: 'completed',
        clientTransactionId: input.clientTransactionId ?? null,
        createdAt: occurredAt,
        items: {
          create: priced.lines.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            bundleId: line.bundleId,
            productName: line.productName,
            variantName: line.variantName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountAmount: 0,
            subtotal: line.subtotal,
            notes: line.notes,
            modifiers: {
              create: line.modifiers.map((m) => ({
                modifierId: m.modifierId,
                modifierName: m.modifierName,
                price: m.price,
              })),
            },
          })),
        },
        payments: {
          create: input.payments.map((p) => ({
            paymentMethod: p.method as PaymentMethod,
            amount: money(p.amount),
            referenceNumber: p.referenceNumber || null,
            status: 'completed' as const,
            // Recorded by the cashier from an external terminal / cash drawer.
            metadata: { recordedBy: input.employeeId, source: 'pos' },
          })),
        },
      },
      select: { id: true, receiptNumber: true },
    });

    await this.consumeDiscounts(tx, input, priced, txn.id);

    const stockChanges = await applyStockChanges(tx, priced.stockDeductions, {
      outletId: input.outletId,
      referenceId: txn.id,
      referenceType: 'transaction',
      employeeId: input.employeeId,
      movementType: 'sale',
      direction: 'deduct',
      logger: this.logger,
    });

    await this.auditPricing(tx, input, priced, txn.id);

    return { txn, stockChanges };
  }

  /** Promotion quota and voucher redemption are consumed atomically with the sale. */
  private async consumeDiscounts(
    tx: Prisma.TransactionClient,
    input: CreateTransactionInput,
    priced: PricedSale,
    transactionId: string,
  ): Promise<void> {
    for (const discount of priced.discounts) {
      if (discount.voucherId) {
        const { count } = await tx.voucher.updateMany({
          where: {
            id: discount.voucherId,
            businessId: input.businessId,
            usedAt: null,
            isActive: true,
          },
          data: { usedAt: new Date(), usedBy: input.customerId || null },
        });
        if (count !== 1) {
          throw new BusinessError(ErrorCode.INVALID_VOUCHER, 'Voucher already used');
        }
      }
      if (discount.promotionId) {
        const ok = await this.promotionRules.incrementUsageCount(
          tx,
          discount.promotionId,
          input.businessId,
        );
        if (!ok) {
          throw new BusinessError(ErrorCode.INVALID_VOUCHER, 'Promotion usage limit reached');
        }
      }
    }
    if (priced.discounts.length > 0) {
      this.logger.debug(`Discounts consumed for transaction ${transactionId}`);
    }
  }

  /** Price overrides and manual discounts are audit-logged (R8). */
  private async auditPricing(
    tx: Prisma.TransactionClient,
    input: CreateTransactionInput,
    priced: PricedSale,
    transactionId: string,
  ): Promise<void> {
    const manual = priced.discounts.filter((d) => d.source === 'manual');
    if (priced.priceOverrides.length === 0 && manual.length === 0) return;
    await tx.auditLog.create({
      data: {
        businessId: input.businessId,
        outletId: input.outletId,
        employeeId: input.employeeId,
        action: priced.priceOverrides.length > 0 ? 'price_override' : 'manual_discount',
        entityType: 'transaction',
        entityId: transactionId,
        newValue: {
          role: input.role,
          priceOverrides: priced.priceOverrides.map((o) => ({ ...o })),
          manualDiscount: toNumber(sumMoney(manual.map((d) => d.amount))),
          subtotal: priced.subtotal.toNumber(),
        },
      },
    });
  }

  private async assertReferences(input: CreateTransactionInput): Promise<void> {
    const shift = await this.prisma.shift.findFirst({
      where: {
        id: input.shiftId,
        outletId: input.outletId,
        outlet: { businessId: input.businessId },
      },
      select: { status: true, employeeId: true },
    });
    if (!shift || shift.status !== 'open') {
      throw new BusinessError(ErrorCode.SHIFT_NOT_OPEN, 'Shift is not open');
    }
    // Cashiers sell on their own shift; supervisors and above may use a colleague's.
    if (
      shift.employeeId !== input.employeeId &&
      (ROLE_HIERARCHY[input.role] ?? 0) < (ROLE_HIERARCHY.supervisor ?? 0)
    ) {
      throw new BusinessError(ErrorCode.SHIFT_NOT_OPEN, 'Shift belongs to another employee');
    }

    await this.tenant.assertOwned('customer', input.customerId, input.businessId);

    if (input.tableId) {
      const table = await this.prisma.table.count({
        where: { id: input.tableId, outletId: input.outletId },
      });
      if (table === 0) {
        throw new AppError(ErrorCode.TABLE_NOT_FOUND, 'Table not found in this outlet', 404);
      }
    }
  }

  private assertPaymentMethods(payments: PaymentInput[]): void {
    if (payments.length === 0) {
      throw new BusinessError(ErrorCode.INVALID_PAYMENT, 'At least one payment is required');
    }
    for (const p of payments) {
      if (p.method === 'credit_note') {
        // There is no credit-note ledger to check a balance against: reject honestly.
        throw new BusinessError(
          ErrorCode.INVALID_PAYMENT,
          'Credit note payments are not supported',
        );
      }
      if (!MANUAL_METHODS.has(p.method)) {
        throw new BusinessError(
          ErrorCode.INVALID_PAYMENT,
          `Unsupported payment method ${p.method}`,
        );
      }
      if (!(p.amount > 0)) {
        throw new BusinessError(ErrorCode.INVALID_PAYMENT, 'Payment amount must be positive');
      }
    }
  }

  private isCashOnly(payments?: PaymentInput[]): boolean {
    return !!payments && payments.length > 0 && payments.every((p) => p.method === 'cash');
  }

  private resolveOccurredAt(occurredAt?: Date): Date {
    const now = Date.now();
    if (!occurredAt) return new Date(now);
    const t = occurredAt.getTime();
    if (Number.isNaN(t)) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'occurredAt is not a valid date');
    }
    if (t > now + MAX_CLOCK_SKEW_MS) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'occurredAt cannot be in the future');
    }
    if (t < now - MAX_OFFLINE_AGE_MS) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'occurredAt is older than 7 days');
    }
    return occurredAt;
  }

  private async findByClientId(
    outletId: string,
    clientTransactionId: string,
  ): Promise<CreateTransactionOutput | null> {
    const existing = await this.prisma.transaction.findFirst({
      where: { outletId, clientTransactionId },
      select: {
        id: true,
        receiptNumber: true,
        grandTotal: true,
        roundingAmount: true,
        payments: { select: { amount: true } },
      },
    });
    if (!existing) return null;
    const paid = sumMoney(existing.payments.map((p) => p.amount));
    const change = paid.minus(existing.grandTotal);
    return {
      transactionId: existing.id,
      receiptNumber: existing.receiptNumber,
      grandTotal: money(existing.grandTotal).toNumber(),
      roundingAmount: money(existing.roundingAmount).toNumber(),
      change: change.isNegative() ? 0 : change.toNumber(),
      loyaltyPointsEarned: 0,
      duplicate: true,
    };
  }

  /** Preview of the points the listener will credit (same formula, R8). */
  private async estimateLoyaltyPoints(
    input: CreateTransactionInput,
    grandTotal: Prisma.Decimal,
  ): Promise<number> {
    if (!input.customerId) return 0;
    try {
      const customer = await this.prisma.customer.findFirst({
        where: { id: input.customerId, businessId: input.businessId, isActive: true },
        select: { loyaltyTier: true },
      });
      if (!customer) return 0;
      const program = await this.prisma.loyaltyProgram.findFirst({
        where: { businessId: input.businessId, isActive: true },
        select: { amountPerPoint: true },
      });
      if (!program) return 0;
      const tier = await this.prisma.loyaltyTier.findFirst({
        where: { businessId: input.businessId, isActive: true, name: customer.loyaltyTier },
        select: { pointMultiplier: true },
      });
      return computeLoyaltyPoints(grandTotal, program.amountPerPoint, tier?.pointMultiplier ?? 1);
    } catch (error) {
      // intentionally ignored: the sale is already committed; the preview number is cosmetic.
      this.logger.warn(
        `Loyalty preview failed for transaction customer ${input.customerId}: ${(error as Error).message}`,
      );
      return 0;
    }
  }
}
