import { Inject, Injectable, Logger } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Prisma, type PaymentMethod } from '@prisma/client';
import { TransactionCreatedEvent } from '@domain/events/transaction-created.event';
import { StockLevelChangedEvent } from '@domain/events/stock-level-changed.event';
import { InsufficientStockException } from '@domain/exceptions/insufficient-stock.exception';
import { AppError } from '@shared/errors/app-error';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import type { IShiftRepository } from '@domain/interfaces/repositories/shift.repository';
import type { IProductRepository } from '@domain/interfaces/repositories/product.repository';
import type { IInventoryRepository } from '@domain/interfaces/repositories/inventory.repository';
import { TaxConfigurationRepository } from '@infrastructure/repositories/settings/tax-configuration.repository';

export interface TransactionItemInput {
  productId?: string;
  bundleId?: string;
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
  roundingAmount: number;
  change: number;
  loyaltyPointsEarned: number;
}

@Injectable()
export class CreateTransactionUseCase {
  private readonly logger = new Logger(CreateTransactionUseCase.name);

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

  async execute(input: CreateTransactionInput): Promise<CreateTransactionOutput> {
    const shift = await this.shiftRepo.findById(input.shiftId);
    if (!shift || shift.status !== 'open') {
      throw new BusinessError(ErrorCode.SHIFT_NOT_OPEN, 'Shift is not open');
    }

    const itemDetails: Array<{
      productId: string | null;
      variantId: string | null;
      bundleId: string | null;
      productName: string;
      variantName: string | null;
      unitPrice: number;
      quantity: number;
      subtotal: number;
      notes: string | null;
      modifiers?: Array<{ modifierId: string; modifierName: string; price: number }>;
    }> = [];

    // Track bundle component stock deductions separately
    const bundleStockDeductions: Array<{
      productId: string;
      variantId: string | null;
      quantity: number;
    }> = [];

    for (const item of input.items) {
      if (item.bundleId) {
        // === BUNDLE PATH ===
        const bundle = await this.prisma.bundlePackage.findFirst({
          where: { id: item.bundleId, isActive: true },
          include: {
            items: {
              include: {
                product: { select: { id: true, name: true, trackStock: true } },
                variant: { select: { id: true, name: true } },
              },
            },
          },
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
          variantId: null,
          bundleId: item.bundleId,
          productName: bundle.name,
          variantName: null,
          unitPrice,
          quantity: item.quantity,
          subtotal: itemSubtotal,
          notes: item.notes || null,
        });

        // Check stock and prepare deductions for each bundle component
        for (const component of bundle.items) {
          const deductQty = Number(component.quantity) * item.quantity;

          if (component.product.trackStock) {
            const stockLevel = await this.inventoryRepo.findStockLevel(
              input.outletId,
              component.productId,
              component.variantId || null,
            );
            if (stockLevel && stockLevel.quantity < deductQty) {
              throw new InsufficientStockException(
                component.productId,
                stockLevel.quantity,
                deductQty,
              );
            }

            bundleStockDeductions.push({
              productId: component.productId,
              variantId: component.variantId || null,
              quantity: deductQty,
            });
          }
        }
      } else {
        // === EXISTING PRODUCT PATH ===
        const product = await this.productRepo.findById(item.productId!);
        if (!product || !product.isActive) {
          throw new AppError(
            ErrorCode.PRODUCT_NOT_FOUND,
            `Product ${item.productId} not found or inactive`,
          );
        }

        // Look up variant price if a variant is selected
        let variantName: string | null = null;
        let baseUnitPrice = product.basePrice;
        if (item.variantId) {
          const variant = await this.prisma.productVariant.findUnique({
            where: { id: item.variantId },
            select: { price: true, name: true },
          });
          if (variant) {
            baseUnitPrice = Number(variant.price);
            variantName = variant.name;
          }
        }

        // Look up modifier prices
        let modifierTotal = 0;
        const modifierRecords: Array<{ modifierId: string; modifierName: string; price: number }> =
          [];
        if (item.modifierIds && item.modifierIds.length > 0) {
          const modifiers = await this.prisma.modifier.findMany({
            where: { id: { in: item.modifierIds } },
            select: { id: true, name: true, price: true },
          });
          for (const mod of modifiers) {
            const modPrice = Number(mod.price);
            modifierTotal += modPrice;
            modifierRecords.push({ modifierId: mod.id, modifierName: mod.name, price: modPrice });
          }
        }

        const unitPrice = item.unitPrice ?? baseUnitPrice;
        const unitPriceWithModifiers = unitPrice + modifierTotal;
        const itemSubtotal = unitPriceWithModifiers * item.quantity;

        itemDetails.push({
          productId: item.productId!,
          variantId: item.variantId || null,
          bundleId: null,
          productName: product.name,
          variantName,
          unitPrice: unitPriceWithModifiers,
          quantity: item.quantity,
          subtotal: itemSubtotal,
          notes: item.notes || null,
          modifiers: modifierRecords,
        });

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

    const subtotal = itemDetails.reduce((sum, item) => sum + item.subtotal, 0);

    let discountAmount = 0;
    if (input.discounts) {
      for (const discount of input.discounts) {
        if (discount.type === 'percentage') {
          if (discount.value > 100) {
            throw new BusinessError(
              ErrorCode.INVALID_PAYMENT,
              'Percentage discount cannot exceed 100%',
            );
          }
          discountAmount += subtotal * (discount.value / 100);
        } else {
          discountAmount += discount.value;
        }
      }
      // Cap total discount at subtotal
      discountAmount = Math.min(discountAmount, subtotal);
    }

    const taxConfig = await this.taxConfigRepo.getTaxConfig(input.outletId);
    const taxRate = taxConfig.taxRate / 100;
    const serviceChargeRate = taxConfig.serviceCharge / 100;
    const taxableAmount = subtotal - discountAmount;
    const serviceCharge =
      input.orderType === 'dine_in' ? Math.round(taxableAmount * serviceChargeRate) : 0;

    let taxAmount: number;

    let rawTotal: number;

    if (taxConfig.taxInclusive) {
      // Tax-inclusive: prices already include tax, back-calculate tax for display
      taxAmount = Math.round(((taxableAmount + serviceCharge) * taxRate) / (1 + taxRate));
      rawTotal = taxableAmount + serviceCharge;
    } else {
      // Tax-exclusive: add tax on top of subtotal
      taxAmount = Math.round((taxableAmount + serviceCharge) * taxRate);
      rawTotal = taxableAmount + serviceCharge + taxAmount;
    }

    // Round to nearest 500 (Indonesian Rupiah convention) and track the rounding difference.
    // The Transaction model does not have a dedicated rounding column, so the rounding
    // amount is documented here for transparency. If a `roundingAmount` column is added
    // to the schema in the future, set it on the transaction record.
    const grandTotal = Math.round(rawTotal / 500) * 500;
    const roundingAmount = grandTotal - rawTotal;

    const totalPayments = input.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPayments < grandTotal) {
      throw new BusinessError(
        ErrorCode.INVALID_PAYMENT,
        `Payment total ${totalPayments} is less than grand total ${grandTotal}`,
      );
    }

    const change = totalPayments - grandTotal;

    const receiptNumber = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
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

      // 2. Create transaction items + modifier records
      for (const item of itemDetails) {
        const txItem = await tx.transactionItem.create({
          data: {
            transactionId: txn.id,
            productId: item.productId,
            variantId: item.variantId,
            bundleId: item.bundleId,
            productName: item.productName,
            variantName: item.variantName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: 0,
            subtotal: item.subtotal,
            notes: item.notes,
          },
        });

        // Create modifier records for this item
        if (item.modifiers && item.modifiers.length > 0) {
          for (const mod of item.modifiers) {
            await tx.transactionItemModifier.create({
              data: {
                transactionItemId: txItem.id,
                modifierId: mod.modifierId,
                modifierName: mod.modifierName,
                price: mod.price,
              },
            });
          }
        }
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

      // 4. Track promotion & voucher usage
      if (input.discounts) {
        for (const discount of input.discounts) {
          if (discount.promotionId) {
            await tx.promotion.update({
              where: { id: discount.promotionId },
              data: { usedCount: { increment: 1 } },
            });
          }
          if (discount.voucherCode) {
            await tx.voucher.updateMany({
              where: { code: discount.voucherCode, usedAt: null },
              data: { usedAt: new Date(), usedBy: input.customerId || null },
            });
          }
        }
      }

      // 5. Deduct stock levels (CRITICAL - must be atomic with transaction creation)
      const stockChanges: Array<{
        productId: string;
        variantId: string | null;
        previousQty: number;
        newQty: number;
      }> = [];

      // 5a. Deduct stock for bundle components
      for (const deduction of bundleStockDeductions) {
        // Use FOR UPDATE to prevent race conditions with concurrent transactions
        const stockLevels = await tx.$queryRaw<Array<{ id: string; quantity: number }>>`
          SELECT id, quantity FROM stock_levels
          WHERE outlet_id = ${input.outletId}::uuid
            AND product_id = ${deduction.productId}::uuid
            AND variant_id ${deduction.variantId ? Prisma.sql`= ${deduction.variantId}::uuid` : Prisma.sql`IS NULL`}
          LIMIT 1
          FOR UPDATE
        `;
        const stockLevel = stockLevels[0];

        if (!stockLevel) continue;

        const currentQty = Number(stockLevel.quantity);
        const newQty = currentQty - deduction.quantity;
        if (newQty < 0) {
          throw new InsufficientStockException(deduction.productId, currentQty, deduction.quantity);
        }

        await tx.stockLevel.update({
          where: { id: stockLevel.id },
          data: { quantity: newQty },
        });

        await tx.stockMovement.create({
          data: {
            outletId: input.outletId,
            productId: deduction.productId,
            variantId: deduction.variantId,
            movementType: 'sale',
            quantity: -deduction.quantity,
            referenceId: txn.id,
            referenceType: 'transaction',
            notes: `Bundle sale component`,
            createdBy: input.employeeId,
            createdAt: new Date(),
          },
        });

        stockChanges.push({
          productId: deduction.productId,
          variantId: deduction.variantId,
          previousQty: currentQty,
          newQty,
        });
      }

      // 5b. Deduct stock for regular product items (skip bundle items)
      for (const item of itemDetails) {
        if (item.bundleId) continue; // Bundle stock already handled above

        const product = await tx.product.findUnique({
          where: { id: item.productId! },
        });

        if (!product?.trackStock) continue;

        // Find stock level with FOR UPDATE lock to prevent race conditions
        const stockLevels = await tx.$queryRaw<Array<{ id: string; quantity: number }>>`
          SELECT id, quantity FROM stock_levels
          WHERE outlet_id = ${input.outletId}::uuid
            AND product_id = ${item.productId!}::uuid
            AND variant_id ${item.variantId ? Prisma.sql`= ${item.variantId}::uuid` : Prisma.sql`IS NULL`}
          LIMIT 1
          FOR UPDATE
        `;
        const stockLevel = stockLevels[0];

        if (!stockLevel) {
          // No stock level record means stock hasn't been initialized for this outlet.
          // Skip deduction rather than blocking the sale.
          this.logger.warn(
            `Stock level record missing for product ${item.productId} (variant: ${item.variantId ?? 'none'}) at outlet ${input.outletId}. Skipping stock deduction.`,
          );
          continue;
        }

        const currentQty = Number(stockLevel.quantity);
        const newQty = currentQty - item.quantity;
        if (newQty < 0) {
          throw new InsufficientStockException(item.productId!, currentQty, item.quantity);
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
            productId: item.productId!,
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

        stockChanges.push({
          productId: item.productId!,
          variantId: item.variantId,
          previousQty: currentQty,
          newQty,
        });
      }

      return { txn, stockChanges };
    });

    this.eventBus.publish(
      new TransactionCreatedEvent(
        transactionRecord.txn.id,
        input.outletId,
        grandTotal,
        input.customerId || null,
      ),
    );

    // Publish stock change events so inventory displays update in real-time
    for (const sc of transactionRecord.stockChanges) {
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

    // Note: Order creation for KDS is handled by TransactionToOrderHandler
    // which listens to TransactionCreatedEvent and creates the order using
    // CreateOrderUseCase for proper event emission and KDS notification

    // Calculate loyalty points earned synchronously so the response includes the actual value.
    // The async event listener will still handle the actual point accrual.
    let loyaltyPointsEarned = 0;
    if (input.customerId) {
      try {
        const customer = await this.prisma.customer.findUnique({
          where: { id: input.customerId },
        });
        if (customer?.isActive) {
          const loyaltyProgram = await this.prisma.loyaltyProgram.findFirst({
            where: { businessId: customer.businessId, isActive: true },
          });
          if (loyaltyProgram) {
            const amountPerPoint = Number(loyaltyProgram.pointsPerAmount);
            if (amountPerPoint > 0) {
              const tiers = await this.prisma.loyaltyTier.findMany({
                where: { businessId: customer.businessId, isActive: true },
                orderBy: { sortOrder: 'asc' },
              });
              const currentTier = tiers.find((t) => t.name === customer.loyaltyTier);
              const multiplier = currentTier ? Number(currentTier.pointMultiplier) : 1;
              loyaltyPointsEarned = Math.floor((grandTotal / amountPerPoint) * multiplier);
            }
          }
        }
      } catch {
        // Non-critical: if loyalty calculation fails, return 0 rather than failing the transaction
        loyaltyPointsEarned = 0;
      }
    }

    return {
      transactionId: transactionRecord.txn.id,
      receiptNumber,
      grandTotal,
      roundingAmount,
      change,
      loyaltyPointsEarned,
    };
  }
}
