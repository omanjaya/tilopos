import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { TransactionCreatedEvent } from '@domain/events/transaction-created.event';
import { InsufficientStockException } from '@domain/exceptions/insufficient-stock.exception';
import { AppError } from '@shared/errors/app-error';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import type { IShiftRepository } from '@domain/interfaces/repositories/shift.repository';
import type { IProductRepository } from '@domain/interfaces/repositories/product.repository';
import type { IInventoryRepository } from '@domain/interfaces/repositories/inventory.repository';
import type { ITransactionRepository } from '@domain/interfaces/repositories/transaction.repository';

export interface TransactionItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
  modifierIds?: string[];
  notes?: string;
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
    @Inject(REPOSITORY_TOKENS.TRANSACTION)
    private readonly transactionRepo: ITransactionRepository,
    private readonly eventBus: EventBusService,
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
        throw new AppError(ErrorCode.PRODUCT_NOT_FOUND, `Product ${item.productId} not found or inactive`);
      }

      const unitPrice = product.basePrice;
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
      throw new BusinessError(ErrorCode.INVALID_PAYMENT, `Payment total ${totalPayments} is less than grand total ${grandTotal}`);
    }

    const change = totalPayments - grandTotal;

    const receiptNumber = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const transactionRecord = await this.transactionRepo.save({
      id: '',
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
    });

    for (const item of itemDetails) {
      const stockLevel = await this.inventoryRepo.findStockLevel(
        input.outletId,
        item.productId,
        item.variantId,
      );
      if (stockLevel) {
        const newQty = stockLevel.quantity - item.quantity;
        if (newQty < 0) {
          throw new InsufficientStockException(item.productId, stockLevel.quantity, item.quantity);
        }
        await this.inventoryRepo.updateStockLevel(stockLevel.id, newQty);
        await this.inventoryRepo.createStockMovement({
          id: '',
          outletId: input.outletId,
          productId: item.productId,
          variantId: item.variantId,
          movementType: 'sale',
          quantity: -item.quantity,
          referenceId: transactionRecord.id,
          referenceType: 'transaction',
          notes: null,
          createdBy: input.employeeId,
          createdAt: new Date(),
        });
      }
    }

    this.eventBus.publish(
      new TransactionCreatedEvent(
        transactionRecord.id,
        input.outletId,
        grandTotal,
        input.customerId || null,
      ),
    );

    return {
      transactionId: transactionRecord.id,
      receiptNumber,
      grandTotal,
      change,
      loyaltyPointsEarned: 0,
    };
  }
}
