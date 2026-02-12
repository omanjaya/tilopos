import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from './event-bus.service';
import { TransactionCreatedEvent } from '../../domain/events/transaction-created.event';
import { TransactionVoidedEvent } from '../../domain/events/transaction-voided.event';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../cache/redis.service';

@Injectable()
export class TransactionEventListener implements OnModuleInit {
  private readonly logger = new Logger(TransactionEventListener.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit() {
    this.eventBus.ofType(TransactionCreatedEvent).subscribe((event) => {
      void this.handleTransactionCreated(event);
    });

    this.eventBus.ofType(TransactionVoidedEvent).subscribe((event) => {
      void this.handleTransactionVoided(event);
    });
  }

  private async handleTransactionCreated(event: TransactionCreatedEvent): Promise<void> {
    // Handle each independently so one failure doesn't block others
    const results = await Promise.allSettled([
      this.deductIngredients(event),
      this.addLoyaltyPoints(event),
      this.logAudit(event),
      this.invalidateReportCache(event.outletId),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error(
          `Event handler failed for transaction ${event.transactionId}:`,
          result.reason,
        );
        // TODO: Add to dead letter queue for retry
      }
    }
  }

  private async deductIngredients(event: TransactionCreatedEvent): Promise<void> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: event.transactionId },
      include: { items: true },
    });

    if (!transaction || transaction.transactionType !== 'sale') return;

    for (const item of transaction.items) {
      if (!item.productId) continue;

      const recipe = await this.prisma.recipe.findFirst({
        where: { productId: item.productId, variantId: item.variantId ?? undefined },
        include: { items: { include: { ingredient: true } } },
      });

      if (!recipe) continue;

      for (const recipeItem of recipe.items) {
        const qtyNeeded = recipeItem.quantity.toNumber() * Number(item.quantity);

        const stockLevel = await this.prisma.ingredientStockLevel.findFirst({
          where: { outletId: event.outletId, ingredientId: recipeItem.ingredientId },
        });

        if (!stockLevel) continue;

        const newQty = stockLevel.quantity.toNumber() - qtyNeeded;

        await this.prisma.ingredientStockLevel.update({
          where: { id: stockLevel.id },
          data: { quantity: Math.max(0, newQty) },
        });

        await this.prisma.ingredientStockMovement.create({
          data: {
            outletId: event.outletId,
            ingredientId: recipeItem.ingredientId,
            movementType: 'usage',
            quantity: -qtyNeeded,
            referenceId: event.transactionId,
            referenceType: 'transaction',
          },
        });

        if (newQty <= stockLevel.lowStockAlert.toNumber()) {
          this.logger.warn(
            `Low ingredient stock: ${recipeItem.ingredient.name} at ${Math.max(0, newQty)} (alert: ${stockLevel.lowStockAlert.toNumber()})`,
          );
        }
      }
    }
  }

  private async addLoyaltyPoints(event: TransactionCreatedEvent): Promise<void> {
    if (!event.customerId) return;

    const customer = await this.prisma.customer.findUnique({
      where: { id: event.customerId },
    });

    if (!customer || !customer.isActive) return;

    const loyaltyProgram = await this.prisma.loyaltyProgram.findFirst({
      where: { businessId: customer.businessId, isActive: true },
    });

    if (!loyaltyProgram) return;

    const amountPerPoint = loyaltyProgram.amountPerPoint.toNumber();
    const tiers = await this.prisma.loyaltyTier.findMany({
      where: { businessId: customer.businessId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const currentTier = tiers.find((t) => t.name === customer.loyaltyTier);
    const multiplier = currentTier ? currentTier.pointMultiplier.toNumber() : 1;
    const pointsEarned = Math.floor((event.grandTotal / amountPerPoint) * multiplier);

    // Use atomic increment to prevent race conditions
    const updatedCustomer = await this.prisma.customer.update({
      where: { id: event.customerId },
      data: {
        loyaltyPoints: { increment: pointsEarned },
        totalSpent: { increment: event.grandTotal },
        visitCount: { increment: 1 },
      },
    });

    const totalPoints = updatedCustomer.loyaltyPoints;

    await this.prisma.loyaltyTransaction.create({
      data: {
        customerId: event.customerId,
        transactionId: event.transactionId,
        type: 'earned',
        points: pointsEarned,
        balanceAfter: totalPoints,
        description: 'Earned from transaction',
      },
    });

    for (const tier of [...tiers].reverse()) {
      if (totalPoints >= tier.minPoints && tier.name !== customer.loyaltyTier) {
        await this.prisma.customer.update({
          where: { id: event.customerId },
          data: { loyaltyTier: tier.name },
        });
        this.logger.log(`Customer ${event.customerId} upgraded to tier: ${tier.name}`);
        break;
      }
    }
  }

  private async logAudit(event: TransactionCreatedEvent): Promise<void> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: event.transactionId },
      include: { outlet: { select: { businessId: true } } },
    });

    if (!transaction) return;

    await this.prisma.auditLog.create({
      data: {
        businessId: transaction.outlet.businessId,
        outletId: event.outletId,
        employeeId: transaction.employeeId,
        action: 'transaction_created',
        entityType: 'transaction',
        entityId: event.transactionId,
        newValue: {
          grandTotal: event.grandTotal,
          transactionType: transaction.transactionType,
          customerId: event.customerId,
        },
      },
    });
  }

  /**
   * Handler for TransactionVoidedEvent
   * Reverses side effects of the original transaction:
   * - Restores ingredient stock (reverses deduction)
   * - Reverses loyalty points earned
   */
  private async handleTransactionVoided(event: TransactionVoidedEvent): Promise<void> {
    const results = await Promise.allSettled([
      this.restoreIngredients(event),
      this.reverseLoyaltyPoints(event),
      this.invalidateReportCache(event.outletId),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error(
          `Event handler failed for voided transaction ${event.transactionId}:`,
          result.reason,
        );
      }
    }
  }

  /**
   * Restores ingredient stock that was deducted when transaction was created
   */
  private async restoreIngredients(event: TransactionVoidedEvent): Promise<void> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: event.transactionId },
      include: { items: true },
    });

    if (!transaction || transaction.transactionType !== 'sale') return;

    for (const item of transaction.items) {
      if (!item.productId) continue;

      const recipe = await this.prisma.recipe.findFirst({
        where: { productId: item.productId, variantId: item.variantId ?? undefined },
        include: { items: { include: { ingredient: true } } },
      });

      if (!recipe) continue;

      for (const recipeItem of recipe.items) {
        const qtyUsed = recipeItem.quantity.toNumber() * Number(item.quantity);

        const stockLevel = await this.prisma.ingredientStockLevel.findFirst({
          where: { outletId: event.outletId, ingredientId: recipeItem.ingredientId },
        });

        if (!stockLevel) continue;

        // Restore the ingredient stock
        await this.prisma.ingredientStockLevel.update({
          where: { id: stockLevel.id },
          data: { quantity: { increment: qtyUsed } },
        });

        // Create movement record for audit trail
        await this.prisma.ingredientStockMovement.create({
          data: {
            outletId: event.outletId,
            ingredientId: recipeItem.ingredientId,
            movementType: 'adjustment',
            quantity: qtyUsed,
            referenceId: event.transactionId,
            referenceType: 'void',
            notes: `Restored from voided transaction: ${event.reason}`,
          },
        });

        this.logger.log(
          `Restored ${qtyUsed} ${recipeItem.ingredient.name} from voided transaction ${event.transactionId}`,
        );
      }
    }
  }

  /**
   * Reverses loyalty points earned from the voided transaction
   */
  private async reverseLoyaltyPoints(event: TransactionVoidedEvent): Promise<void> {
    // Find the original loyalty transaction
    const loyaltyTransaction = await this.prisma.loyaltyTransaction.findFirst({
      where: {
        transactionId: event.transactionId,
        type: 'earned',
      },
    });

    if (!loyaltyTransaction) {
      this.logger.debug(
        `No loyalty transaction found for ${event.transactionId}, skipping reversal`,
      );
      return;
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: loyaltyTransaction.customerId },
    });

    if (!customer || !customer.isActive) {
      this.logger.warn(
        `Customer ${loyaltyTransaction.customerId} not found or inactive, skipping loyalty reversal`,
      );
      return;
    }

    const pointsToDeduct = loyaltyTransaction.points;

    // Atomically deduct loyalty points
    const updatedCustomer = await this.prisma.customer.update({
      where: { id: loyaltyTransaction.customerId },
      data: {
        loyaltyPoints: { decrement: pointsToDeduct },
        totalSpent: { decrement: event.grandTotal },
        visitCount: { decrement: 1 },
      },
    });

    // Create reversal loyalty transaction
    await this.prisma.loyaltyTransaction.create({
      data: {
        customerId: loyaltyTransaction.customerId,
        transactionId: event.transactionId,
        type: 'redeemed', // Using 'redeemed' type for point deduction
        points: -pointsToDeduct,
        balanceAfter: updatedCustomer.loyaltyPoints,
        description: `Reversed from voided transaction: ${event.reason}`,
      },
    });

    this.logger.log(
      `Reversed ${pointsToDeduct} loyalty points from customer ${loyaltyTransaction.customerId} (voided transaction ${event.transactionId})`,
    );

    // Check if tier downgrade is needed
    const tiers = await this.prisma.loyaltyTier.findMany({
      where: { businessId: customer.businessId, isActive: true },
      orderBy: { minPoints: 'desc' },
    });

    for (const tier of tiers) {
      if (updatedCustomer.loyaltyPoints >= tier.minPoints) {
        if (tier.name !== updatedCustomer.loyaltyTier) {
          await this.prisma.customer.update({
            where: { id: loyaltyTransaction.customerId },
            data: { loyaltyTier: tier.name },
          });
          this.logger.log(
            `Customer ${loyaltyTransaction.customerId} downgraded to tier: ${tier.name}`,
          );
        }
        break;
      }
    }
  }

  /**
   * Invalidate all report caches for the outlet (and business-level reports).
   * This ensures dashboards and reports reflect the latest transaction data.
   */
  private async invalidateReportCache(outletId: string): Promise<void> {
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { businessId: true },
    });
    const businessId = outlet?.businessId;

    await Promise.all([
      this.redis.invalidatePattern(`report:*:${outletId}:*`),
      this.redis.invalidatePattern(`report:dashboard:*:${outletId}:*`),
      this.redis.invalidatePattern(`staff:leaderboard:*`),
      ...(businessId
        ? [
            this.redis.invalidatePattern(`report:dashboard:outlet-comparison:${businessId}:*`),
            this.redis.invalidatePattern(`owner:analytics:*:${businessId}:*`),
            this.redis.invalidatePattern(`financial:*:${businessId}:*`),
          ]
        : []),
    ]);
  }
}
