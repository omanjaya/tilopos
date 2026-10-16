import { Injectable, Logger } from '@nestjs/common';
import { Prisma, type PaymentMethod } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { TransactionCreatedEvent } from '@domain/events/transaction-created.event';
import { StockLevelChangedEvent } from '@domain/events/stock-level-changed.event';
import { AppError } from '@shared/errors/app-error';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import { DocumentNumberService } from '@shared/numbering';
import { money, sumMoney, toNumber } from '@shared/utils/money';
import { SalePricingService } from '../../services/sale-pricing.service';
import { PromotionRulesEngine } from '../../services/promotion-rules.engine';
import { applyStockChanges } from '../../services/sale-stock';

export interface CreateCreditTransactionInput {
  businessId: string;
  outletId: string;
  employeeId: string;
  role: string;
  customerId: string;
  shiftId: string;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  tableId?: string;
  items: Array<{
    productId?: string;
    bundleId?: string;
    variantId?: string;
    quantity: number;
    modifierIds?: string[];
    notes?: string;
    /** Honoured only with pos_price_editing + role >= supervisor (SalePricingService). */
    unitPrice?: number;
  }>;
  payments?: Array<{
    method: string;
    amount: number;
    referenceNumber?: string;
  }>;
  /** Manual discounts, capped per role by SalePricingService. */
  discountAmount?: number;
  discountPercent?: number;
  notes?: string;
  dueDate?: string;
  creditNotes?: string;
}

export interface CreateCreditTransactionOutput {
  transactionId: string;
  creditSaleId: string;
  receiptNumber: string;
  grandTotal: number;
  downPayment: number;
  outstandingAmount: number;
}

/**
 * Credit (BON) sale. Pricing, discounts and stock follow the same server-side
 * rules as cash sales (R8); the credit-limit check and the balance increment are
 * one conditional UPDATE inside the transaction, so concurrent sales cannot
 * exceed the limit (R9).
 */
@Injectable()
export class CreateCreditTransactionUseCase {
  private readonly logger = new Logger(CreateCreditTransactionUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly pricing: SalePricingService,
    private readonly promotionRules: PromotionRulesEngine,
    private readonly documentNumbers: DocumentNumberService,
  ) {}

  async execute(input: CreateCreditTransactionInput): Promise<CreateCreditTransactionOutput> {
    if (!input.customerId) {
      throw new BusinessError(
        ErrorCode.CUSTOMER_REQUIRED_FOR_CREDIT,
        'Customer is required for credit sales',
      );
    }

    const shift = await this.prisma.shift.findFirst({
      where: { id: input.shiftId, outletId: input.outletId, status: 'open' },
      select: { id: true },
    });
    if (!shift) {
      throw new BusinessError(ErrorCode.SHIFT_NOT_OPEN, 'Shift is not open');
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id: input.customerId, businessId: input.businessId, isActive: true },
      select: { id: true },
    });
    if (!customer) {
      throw new BusinessError(ErrorCode.CUSTOMER_NOT_FOUND, 'Customer not found');
    }

    if (input.tableId) {
      const table = await this.prisma.table.count({
        where: { id: input.tableId, outletId: input.outletId },
      });
      if (table === 0) throw new AppError(ErrorCode.TABLE_NOT_FOUND, 'Table not found');
    }

    const payments = input.payments ?? [];
    for (const p of payments) {
      if (p.method === 'credit_note') {
        throw new BusinessError(
          ErrorCode.INVALID_PAYMENT,
          'Credit notes are not supported as a down payment',
        );
      }
    }

    const discounts: Array<{ type: 'percentage' | 'fixed'; value: number }> = [];
    if (input.discountPercent && input.discountPercent > 0) {
      discounts.push({ type: 'percentage', value: input.discountPercent });
    } else if (input.discountAmount && input.discountAmount > 0) {
      discounts.push({ type: 'fixed', value: input.discountAmount });
    }

    const priced = await this.pricing.priceSale(
      {
        businessId: input.businessId,
        outletId: input.outletId,
        role: input.role,
        customerId: input.customerId,
        orderType: input.orderType,
        applyCashRounding: false,
        // Credit sales have never carried a service charge.
        applyServiceCharge: false,
      },
      input.items,
      discounts,
    );

    const grandTotal = priced.grandTotal;
    const downPayment = sumMoney(payments.map((p) => p.amount));
    if (downPayment.gt(grandTotal)) {
      throw new BusinessError(
        ErrorCode.INVALID_TRANSACTION,
        `Down payment (${downPayment.toString()}) cannot exceed grand total (${grandTotal.toString()})`,
      );
    }
    const outstanding = grandTotal.minus(downPayment);
    const transactionStatus = downPayment.gt(0) ? 'partially_paid' : 'credit';
    const transactionId = crypto.randomUUID();
    const creditSaleId = crypto.randomUUID();

    const { receiptNumber, stockChanges } = await this.prisma.$transaction(async (tx) => {
      // 1. Credit limit + balance in one conditional update (row-locked by Postgres).
      if (outstanding.gt(0)) {
        const amount = outstanding.toString();
        const updated = await tx.$queryRaw<Array<{ id: string }>>`
          UPDATE customers
             SET credit_balance = credit_balance + ${amount}::numeric, updated_at = now()
           WHERE id = ${input.customerId}::uuid
             AND business_id = ${input.businessId}::uuid
             AND credit_balance + ${amount}::numeric <= credit_limit
          RETURNING id`;
        if (updated.length === 0) {
          const current = await tx.customer.findFirst({
            where: { id: input.customerId, businessId: input.businessId },
            select: { creditLimit: true, creditBalance: true },
          });
          throw new BusinessError(
            ErrorCode.INVALID_TRANSACTION,
            `Credit limit exceeded. Limit: ${toNumber(current?.creditLimit)}, Current: ${toNumber(current?.creditBalance)}, New charge: ${outstanding.toNumber()}`,
          );
        }
      }

      const number = await this.documentNumbers.next(tx, input.businessId, 'TXN');

      // 2. Transaction + items + modifiers + down payments in one nested write.
      await tx.transaction.create({
        data: {
          id: transactionId,
          outletId: input.outletId,
          employeeId: input.employeeId,
          customerId: input.customerId,
          shiftId: input.shiftId,
          receiptNumber: number,
          transactionType: 'sale',
          orderType: input.orderType,
          tableId: input.tableId || null,
          subtotal: priced.subtotal,
          discountAmount: priced.discountAmount,
          taxAmount: priced.taxAmount,
          serviceCharge: priced.serviceCharge,
          grandTotal,
          notes: input.notes || null,
          status: transactionStatus,
          items: {
            create: priced.lines.map((line) => ({
              productId: line.productId,
              bundleId: line.bundleId,
              variantId: line.variantId,
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
            create: payments.map((p) => ({
              paymentMethod: p.method as PaymentMethod,
              amount: money(p.amount),
              referenceNumber: p.referenceNumber || null,
            })),
          },
        },
      });

      // 3. Promotion / voucher usage (manual discounts only here, but keep parity).
      await this.consumeDiscounts(tx, input.businessId, input.customerId, priced.discounts);

      // 4. Stock (atomic conditional decrement).
      const changes = await applyStockChanges(tx, priced.stockDeductions, {
        outletId: input.outletId,
        referenceId: transactionId,
        referenceType: 'transaction',
        employeeId: input.employeeId,
        movementType: 'sale',
        direction: 'deduct',
        logger: this.logger,
      });

      // 5. Credit sale record.
      await tx.creditSale.create({
        data: {
          id: creditSaleId,
          transactionId,
          customerId: input.customerId,
          outletId: input.outletId,
          totalAmount: grandTotal,
          paidAmount: downPayment,
          outstandingAmount: outstanding,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          status: outstanding.lte(0) ? 'settled' : 'outstanding',
          notes: input.creditNotes || null,
          createdBy: input.employeeId,
        },
      });

      // 6. Audit price overrides / manual discounts (R8).
      if (priced.priceOverrides.length > 0 || priced.discounts.some((d) => d.source === 'manual')) {
        await tx.auditLog.create({
          data: {
            businessId: input.businessId,
            outletId: input.outletId,
            employeeId: input.employeeId,
            action: 'credit_sale_price_adjusted',
            entityType: 'transaction',
            entityId: transactionId,
            newValue: {
              priceOverrides: priced.priceOverrides,
              manualDiscount: toNumber(
                priced.discounts.find((d) => d.source === 'manual')?.amount ?? 0,
              ),
              role: input.role,
            } as unknown as Prisma.InputJsonValue,
          },
        });
      }

      // Customer totalSpent/visitCount are updated once, by TransactionEventListener.
      return { receiptNumber: number, stockChanges: changes };
    });

    this.eventBus.publish(
      new TransactionCreatedEvent(
        transactionId,
        input.outletId,
        grandTotal.toNumber(),
        input.customerId,
      ),
    );
    for (const sc of stockChanges) {
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

    return {
      transactionId,
      creditSaleId,
      receiptNumber,
      grandTotal: grandTotal.toNumber(),
      downPayment: downPayment.toNumber(),
      outstandingAmount: outstanding.toNumber(),
    };
  }

  private async consumeDiscounts(
    tx: Prisma.TransactionClient,
    businessId: string,
    customerId: string,
    discounts: Awaited<ReturnType<SalePricingService['priceSale']>>['discounts'],
  ): Promise<void> {
    for (const d of discounts) {
      if (d.voucherId) {
        const { count } = await tx.voucher.updateMany({
          where: { id: d.voucherId, businessId, usedAt: null, isActive: true },
          data: { usedAt: new Date(), usedBy: customerId },
        });
        if (count !== 1) {
          throw new BusinessError(ErrorCode.INVALID_VOUCHER, 'Voucher already used');
        }
      }
      if (d.promotionId) {
        const ok = await this.promotionRules.incrementUsageCount(tx, d.promotionId, businessId);
        if (!ok) {
          throw new BusinessError(ErrorCode.INVALID_VOUCHER, 'Promotion usage limit reached');
        }
      }
    }
  }
}
