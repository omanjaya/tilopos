import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import type { PaymentMethod } from '@prisma/client';
import { TransactionCreatedEvent } from '@domain/events/transaction-created.event';
import { InsufficientStockException } from '@domain/exceptions/insufficient-stock.exception';
import { AppError } from '@shared/errors/app-error';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import type { IShiftRepository } from '@domain/interfaces/repositories/shift.repository';
import type { IProductRepository } from '@domain/interfaces/repositories/product.repository';
import type { IInventoryRepository } from '@domain/interfaces/repositories/inventory.repository';
import { TaxConfigurationRepository } from '@infrastructure/repositories/settings/tax-configuration.repository';

export interface CreateCreditTransactionInput {
  outletId: string;
  employeeId: string;
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
    unitPrice?: number;
  }>;
  payments?: Array<{
    method: string;
    amount: number;
    referenceNumber?: string;
  }>;
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

@Injectable()
export class CreateCreditTransactionUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.SHIFT)
    private readonly shiftRepo: IShiftRepository,
    @Inject(REPOSITORY_TOKENS.PRODUCT)
    private readonly productRepo: IProductRepository,
    @Inject(REPOSITORY_TOKENS.INVENTORY)
    private readonly inventoryRepo: IInventoryRepository,
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
    private readonly taxConfigRepo: TaxConfigurationRepository,
  ) {}

  async execute(input: CreateCreditTransactionInput): Promise<CreateCreditTransactionOutput> {
    // Validate shift
    const shift = await this.shiftRepo.findById(input.shiftId);
    if (!shift || shift.status !== 'open') {
      throw new BusinessError(ErrorCode.SHIFT_NOT_OPEN, 'Shift is not open');
    }

    // Customer is required for credit sales
    if (!input.customerId) {
      throw new BusinessError(
        ErrorCode.CUSTOMER_REQUIRED_FOR_CREDIT,
        'Customer is required for credit sales',
      );
    }

    // Validate customer credit limit
    const customer = await this.prisma.customer.findUnique({
      where: { id: input.customerId },
      select: { creditLimit: true, creditBalance: true },
    });
    if (!customer) {
      throw new BusinessError(ErrorCode.CUSTOMER_REQUIRED_FOR_CREDIT, 'Customer not found');
    }

    // Validate items and build details (same pattern as create-transaction)
    const itemDetails: Array<{
      productId: string | null;
      bundleId: string | null;
      variantId: string | null;
      productName: string;
      variantName: string | null;
      unitPrice: number;
      quantity: number;
      subtotal: number;
      notes: string | null;
    }> = [];

    for (const item of input.items) {
      if (item.bundleId) {
        // Bundle path
        const bundle = await this.prisma.bundlePackage.findFirst({
          where: { id: item.bundleId, isActive: true },
          include: { items: { include: { product: true, variant: true } } },
        });
        if (!bundle) {
          throw new AppError(
            ErrorCode.PRODUCT_NOT_FOUND,
            `Bundle ${item.bundleId} not found or inactive`,
          );
        }
        const unitPrice = item.unitPrice ?? Number(bundle.price);
        const itemSubtotal = unitPrice * item.quantity;
        itemDetails.push({
          productId: null,
          bundleId: item.bundleId,
          variantId: null,
          productName: bundle.name,
          variantName: null,
          unitPrice,
          quantity: item.quantity,
          subtotal: itemSubtotal,
          notes: item.notes || null,
        });
      } else {
        // Product path
        const product = await this.productRepo.findById(item.productId!);
        if (!product || !product.isActive) {
          throw new AppError(
            ErrorCode.PRODUCT_NOT_FOUND,
            `Product ${item.productId} not found or inactive`,
          );
        }

        const unitPrice = item.unitPrice ?? product.basePrice;
        const itemSubtotal = unitPrice * item.quantity;

        itemDetails.push({
          productId: item.productId!,
          bundleId: null,
          variantId: item.variantId || null,
          productName: product.name,
          variantName: null,
          unitPrice,
          quantity: item.quantity,
          subtotal: itemSubtotal,
          notes: item.notes || null,
        });

        // Stock validation
        if (product.trackStock) {
          const stockLevel = await this.inventoryRepo.findStockLevel(
            input.outletId,
            item.productId!,
            item.variantId || null,
          );
          if (stockLevel && stockLevel.quantity < item.quantity) {
            throw new InsufficientStockException(
              item.productId!,
              stockLevel.quantity,
              item.quantity,
            );
          }
        }
      }
    }

    // Calculate totals
    const subtotal = itemDetails.reduce((sum, item) => sum + item.subtotal, 0);

    // Calculate discount
    let discountAmount = 0;
    if (input.discountPercent && input.discountPercent > 0) {
      discountAmount = Math.min(Math.round((subtotal * input.discountPercent) / 100), subtotal);
    } else if (input.discountAmount && input.discountAmount > 0) {
      discountAmount = Math.min(input.discountAmount, subtotal);
    }

    const taxableAmount = subtotal - discountAmount;
    const taxConfig = await this.taxConfigRepo.getTaxConfig(input.outletId);
    const taxRate = taxConfig.taxRate / 100;

    let taxAmount: number;
    let grandTotal: number;

    if (taxConfig.taxInclusive) {
      // Tax-inclusive: prices already include tax, back-calculate for display
      taxAmount = Math.round((taxableAmount * taxRate) / (1 + taxRate));
      grandTotal = Math.round(taxableAmount / 500) * 500;
    } else {
      // Tax-exclusive: add tax on top
      taxAmount = Math.round(taxableAmount * taxRate);
      grandTotal = Math.round((taxableAmount + taxAmount) / 500) * 500;
    }

    // Calculate down payment
    const downPayment = (input.payments || []).reduce((sum, p) => sum + p.amount, 0);
    if (downPayment > grandTotal) {
      throw new BusinessError(
        ErrorCode.INVALID_TRANSACTION,
        `Down payment (${downPayment}) cannot exceed grand total (${grandTotal})`,
      );
    }
    const outstandingAmount = grandTotal - downPayment;

    // Enforce credit limit
    if (customer.creditLimit !== null && customer.creditLimit !== undefined) {
      const newBalance = Number(customer.creditBalance ?? 0) + outstandingAmount;
      if (newBalance > Number(customer.creditLimit)) {
        throw new BusinessError(
          ErrorCode.INVALID_TRANSACTION,
          `Credit limit exceeded. Limit: ${customer.creditLimit}, Current: ${customer.creditBalance}, New charge: ${outstandingAmount}`,
        );
      }
    }

    const transactionStatus = downPayment > 0 ? 'partially_paid' : 'credit';

    const receiptNumber = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const transactionId = crypto.randomUUID();
    const creditSaleId = crypto.randomUUID();

    // ATOMIC TRANSACTION: Create transaction + deduct stock + create credit sale record
    await this.prisma.$transaction(async (tx) => {
      // 1. Create transaction record
      await tx.transaction.create({
        data: {
          id: transactionId,
          outletId: input.outletId,
          employeeId: input.employeeId,
          customerId: input.customerId,
          shiftId: input.shiftId,
          receiptNumber,
          transactionType: 'sale',
          orderType: input.orderType,
          tableId: input.tableId || null,
          subtotal,
          discountAmount,
          taxAmount,
          serviceCharge: 0,
          grandTotal,
          notes: input.notes || null,
          status: transactionStatus,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // 2. Create transaction items
      for (const item of itemDetails) {
        await tx.transactionItem.create({
          data: {
            transactionId,
            productId: item.productId,
            bundleId: item.bundleId,
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

      // 3. Create down payment records (if any)
      for (const payment of input.payments || []) {
        await tx.payment.create({
          data: {
            transactionId,
            paymentMethod: payment.method as PaymentMethod,
            amount: payment.amount,
            referenceNumber: payment.referenceNumber || null,
          },
        });
      }

      // 4. Deduct stock levels (CRITICAL - must be atomic with transaction creation)

      // 4a. Deduct stock for bundle components
      for (const item of itemDetails) {
        if (!item.bundleId) continue;

        const bundle = await tx.bundlePackage.findFirst({
          where: { id: item.bundleId },
          include: {
            items: {
              include: {
                product: { select: { id: true, trackStock: true } },
              },
            },
          },
        });

        if (!bundle) continue;

        for (const component of bundle.items) {
          if (!component.product.trackStock) continue;
          const deductQty = Number(component.quantity) * item.quantity;

          const stockLevel = await tx.stockLevel.findFirst({
            where: {
              outletId: input.outletId,
              productId: component.productId,
              variantId: component.variantId || null,
            },
          });

          if (!stockLevel) continue;

          const currentQty = Number(stockLevel.quantity);
          const newQty = currentQty - deductQty;
          if (newQty < 0) {
            throw new InsufficientStockException(component.productId, currentQty, deductQty);
          }

          await tx.stockLevel.update({
            where: { id: stockLevel.id },
            data: { quantity: newQty },
          });

          await tx.stockMovement.create({
            data: {
              outletId: input.outletId,
              productId: component.productId,
              variantId: component.variantId || null,
              movementType: 'sale',
              quantity: -deductQty,
              referenceId: transactionId,
              referenceType: 'transaction',
              notes: `Credit Sale bundle component: ${item.productName}`,
              createdBy: input.employeeId,
              createdAt: new Date(),
            },
          });
        }
      }

      // 4b. Deduct stock for regular product items
      for (const item of itemDetails) {
        if (!item.productId) continue;

        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product?.trackStock) continue;

        const stockLevel = await tx.stockLevel.findFirst({
          where: {
            outletId: input.outletId,
            productId: item.productId,
            variantId: item.variantId || null,
          },
        });

        if (!stockLevel) continue;

        const currentQty = Number(stockLevel.quantity);
        const newQty = currentQty - item.quantity;
        if (newQty < 0) {
          throw new InsufficientStockException(item.productId, currentQty, item.quantity);
        }

        await tx.stockLevel.update({
          where: { id: stockLevel.id },
          data: { quantity: newQty },
        });

        await tx.stockMovement.create({
          data: {
            outletId: input.outletId,
            productId: item.productId,
            variantId: item.variantId || null,
            movementType: 'sale',
            quantity: -item.quantity,
            referenceId: transactionId,
            referenceType: 'transaction',
            notes: `Credit Sale: ${item.productName}`,
            createdBy: input.employeeId,
            createdAt: new Date(),
          },
        });
      }

      // 5. Create credit sale record
      await tx.creditSale.create({
        data: {
          id: creditSaleId,
          transactionId,
          customerId: input.customerId,
          outletId: input.outletId,
          totalAmount: grandTotal,
          paidAmount: downPayment,
          outstandingAmount,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          status: outstandingAmount <= 0 ? 'settled' : 'outstanding',
          notes: input.creditNotes || null,
          createdBy: input.employeeId,
        },
      });

      // 6. Update customer credit balance and visit stats
      await tx.customer.update({
        where: { id: input.customerId },
        data: {
          creditBalance: { increment: outstandingAmount },
          totalSpent: { increment: grandTotal },
          visitCount: { increment: 1 },
          lastVisitAt: new Date(),
        },
      });
    });

    // Publish event for downstream handlers (KDS, notifications, etc.)
    this.eventBus.publish(
      new TransactionCreatedEvent(transactionId, input.outletId, grandTotal, input.customerId),
    );

    return {
      transactionId,
      creditSaleId,
      receiptNumber,
      grandTotal,
      downPayment,
      outstandingAmount,
    };
  }
}
