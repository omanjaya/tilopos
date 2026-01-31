import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from './event-bus.service';
import { TransactionCreatedEvent } from '../../domain/events/transaction-created.event';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class TransactionEventListener implements OnModuleInit {
  private readonly logger = new Logger(TransactionEventListener.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.eventBus.ofType(TransactionCreatedEvent).subscribe(event => {
      void this.handleTransactionCreated(event);
    });
  }

  private async handleTransactionCreated(event: TransactionCreatedEvent): Promise<void> {
    // Handle each independently so one failure doesn't block others
    const results = await Promise.allSettled([
      this.deductIngredients(event),
      this.addLoyaltyPoints(event),
      this.logAudit(event),
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

    const currentTier = tiers.find(t => t.name === customer.loyaltyTier);
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
}
