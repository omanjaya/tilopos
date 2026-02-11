import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type { PaymentMethod } from '@prisma/client';
import { TransactionCreatedEvent } from '@domain/events/transaction-created.event';
import { InsufficientStockException } from '@domain/exceptions/insufficient-stock.exception';
import { AppError } from '@shared/errors/app-error';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import type { IShiftRepository } from '@domain/interfaces/repositories/shift.repository';
import type { IProductRepository } from '@domain/interfaces/repositories/product.repository';
import type { IInventoryRepository } from '@domain/interfaces/repositories/inventory.repository';

export interface TransactionItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
  modifierIds?: string[];
  notes?: string;
  unitPrice?: number;
}

export interface PaymentInput {
  method: string;
  amount: number;
  referenceNumber?: string;
}

export interface DiscountInput {
  type: 'percentage' | 'fixed';
  value: number;
  promotionId?: string;
  voucherCode?: string;
}

export interface CreateTransactionInput {
  outletId: string;
  employeeId: string;
  customerId?: string;
  shiftId: string;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  tableId?: string;
  items: TransactionItemInput[];
  payments: PaymentInput[];
  discounts?: DiscountInput[];
  notes?: string;
}

export interface CreateTransactionOutput {
  transactionId: string;
  receiptNumber: string;
  grandTotal: number;
  change: number;
  loyaltyPointsEarned: number;
}

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.SHIFT)
    private readonly shiftRepo: IShiftRepository,
    @Inject(REPOSITORY_TOKENS.PRODUCT)
    private readonly productRepo: IProductRepository,
    @Inject(REPOSITORY_TOKENS.INVENTORY)
    private readonly inventoryRepo: IInventoryRepository,
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CreateTransactionInput): Promise<CreateTransactionOutput> {
    const shift = await this.shiftRepo.findById(input.shiftId);
    if (!shift || shift.status !== 'open') {
      throw new BusinessError(ErrorCode.SHIFT_NOT_OPEN, 'Shift is not open');
    }

    const itemDetails: Array<{
      productId: string;
      variantId: string | null;
      productName: string;
      variantName: string | null;
      unitPrice: number;
      quantity: number;
      subtotal: number;
      notes: string | null;
    }> = [];

    for (const item of input.items) {
      const product = await this.productRepo.findById(item.productId);
      if (!product || !product.isActive) {
        throw new AppError(
          ErrorCode.PRODUCT_NOT_FOUND,
          `Product ${item.productId} not found or inactive`,
        );
      }

      const unitPrice = item.unitPrice ?? product.basePrice;
      const itemSubtotal = unitPrice * item.quantity;

      itemDetails.push({
        productId: item.productId,
        variantId: item.variantId || null,
        productName: product.name,
        variantName: null,
        unitPrice,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        notes: item.notes || null,
      });

      if (product.trackStock) {
        const stockLevel = await this.inventoryRepo.findStockLevel(
          input.outletId,
          item.productId,
          item.variantId || null,
        );
        if (stockLevel && stockLevel.quantity < item.quantity) {
          throw new InsufficientStockException(item.productId, stockLevel.quantity, item.quantity);
        }
      }
    }

    const subtotal = itemDetails.reduce((sum, item) => sum + item.subtotal, 0);

    let discountAmount = 0;
    if (input.discounts) {
      for (const discount of input.discounts) {
        if (discount.type === 'percentage') {
          discountAmount += subtotal * (discount.value / 100);
        } else {
          discountAmount += discount.value;
        }
      }
    }

    const taxRate = 0.11;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = Math.round(taxableAmount * taxRate);
    const serviceCharge = 0;
    const grandTotal = taxableAmount + taxAmount + serviceCharge;

    const totalPayments = input.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPayments < grandTotal) {
      throw new BusinessError(
        ErrorCode.INVALID_PAYMENT,
        `Payment total ${totalPayments} is less than grand total ${grandTotal}`,
      );
    }

    const change = totalPayments - grandTotal;

    const receiptNumber = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const transactionId = crypto.randomUUID();

    // ATOMIC TRANSACTION: Create transaction + deduct stock + create movements
    // This ensures all-or-nothing execution - prevents race conditions
    const transactionRecord = await this.prisma.$transaction(async (tx) => {
      // 1. Create transaction record
      const txn = await tx.transaction.create({
        data: {
          id: transactionId,
          outletId: input.outletId,
          employeeId: input.employeeId,
          customerId: input.customerId || null,
          shiftId: input.shiftId,
          receiptNumber,
          transactionType: 'sale',
          orderType: input.orderType,
          tableId: input.tableId || null,
          subtotal,
          discountAmount,
          taxAmount,
          serviceCharge,
          grandTotal,
          notes: input.notes || null,
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // 2. Create transaction items
      for (const item of itemDetails) {
        await tx.transactionItem.create({
          data: {
            transactionId: txn.id,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: 0,
            subtotal: item.subtotal,
            notes: item.notes,
          },
        });
      }

      // 3. Create payments
      for (const payment of input.payments) {
        await tx.payment.create({
          data: {
            transactionId: txn.id,
            paymentMethod: payment.method as PaymentMethod,
            amount: payment.amount,
            referenceNumber: payment.referenceNumber || null,
          },
        });
      }

      // 4. Deduct stock levels (CRITICAL - must be atomic with transaction creation)
      for (const item of itemDetails) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product?.trackStock) continue;

        // Find stock level with FOR UPDATE lock to prevent race conditions
        const stockLevel = await tx.stockLevel.findFirst({
          where: {
            outletId: input.outletId,
            productId: item.productId,
            variantId: item.variantId || null,
          },
        });

        if (!stockLevel) {
          throw new InsufficientStockException(item.productId, 0, item.quantity);
        }

        const currentQty = Number(stockLevel.quantity);
        const newQty = currentQty - item.quantity;
        if (newQty < 0) {
          throw new InsufficientStockException(item.productId, currentQty, item.quantity);
        }

        // Update stock level atomically
        await tx.stockLevel.update({
          where: { id: stockLevel.id },
          data: { quantity: newQty },
        });

        // Create stock movement audit trail
        await tx.stockMovement.create({
          data: {
            outletId: input.outletId,
            productId: item.productId,
            variantId: item.variantId || null,
            movementType: 'sale',
            quantity: -item.quantity,
            referenceId: txn.id,
            referenceType: 'transaction',
            notes: `Sale: ${item.productName}`,
            createdBy: input.employeeId,
            createdAt: new Date(),
          },
        });
      }

      return txn;
    });

    this.eventBus.publish(
      new TransactionCreatedEvent(
        transactionRecord.id,
        input.outletId,
        grandTotal,
        input.customerId || null,
      ),
    );

    // Note: Order creation for KDS is handled by TransactionToOrderHandler
    // which listens to TransactionCreatedEvent and creates the order using
    // CreateOrderUseCase for proper event emission and KDS notification

    return {
      transactionId: transactionRecord.id,
      receiptNumber,
      grandTotal,
      change,
      loyaltyPointsEarned: 0,
    };
  }
}
