import { Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SagaStep } from '../saga-orchestrator';

// ==================== Context ====================

export interface CreateOrderContext extends Record<string, unknown> {
  // Input
  outletId: string;
  businessId: string;
  orderNumber: string;
  orderType: string;
  tableId?: string;
  customerId?: string;
  items: Array<{
    productId: string;
    variantId?: string;
    productName: string;
    quantity: number;
    station?: string;
    notes?: string;
  }>;

  // Output from steps
  stockValidated?: boolean;
  orderId?: string;
  ingredientsDeducted?: boolean;
  kdsSent?: boolean;

  // Rollback data
  deductedIngredients?: Array<{
    ingredientId: string;
    outletId: string;
    quantity: number;
    stockLevelId: string;
    movementId: string;
  }>;
}

// ==================== Step 1: Validate Stock Availability ====================

export class ValidateStockStep implements SagaStep<CreateOrderContext> {
  readonly name = 'validate-stock';
  private readonly logger = new Logger(ValidateStockStep.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: CreateOrderContext): Promise<CreateOrderContext> {
    this.logger.debug(`Validating stock for ${context.items.length} items`);

    for (const item of context.items) {
      // Find recipe for this product
      const recipe = await this.prisma.recipe.findFirst({
        where: {
          productId: item.productId,
          ...(item.variantId ? { variantId: item.variantId } : {}),
        },
        include: {
          items: { include: { ingredient: true } },
        },
      });

      if (!recipe) continue; // No recipe = no ingredient tracking

      for (const recipeItem of recipe.items) {
        const needed = Number(recipeItem.quantity) * item.quantity;

        const stockLevel = await this.prisma.ingredientStockLevel.findFirst({
          where: {
            outletId: context.outletId,
            ingredientId: recipeItem.ingredientId,
          },
        });

        if (!stockLevel) {
          throw new Error(
            `No stock record for ingredient "${recipeItem.ingredient.name}" at this outlet`,
          );
        }

        const available = Number(stockLevel.quantity);
        if (available < needed) {
          throw new Error(
            `Insufficient stock for "${recipeItem.ingredient.name}": need ${needed} ${recipeItem.unit}, have ${available}`,
          );
        }
      }
    }

    return { ...context, stockValidated: true };
  }

  async compensate(context: CreateOrderContext): Promise<CreateOrderContext> {
    // Validation is a read-only check, nothing to compensate
    this.logger.debug('Compensating stock validation (no-op)');
    return { ...context, stockValidated: false };
  }
}

// ==================== Step 2: Create Order Record ====================

export class CreateOrderRecordStep implements SagaStep<CreateOrderContext> {
  readonly name = 'create-order-record';
  private readonly logger = new Logger(CreateOrderRecordStep.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: CreateOrderContext): Promise<CreateOrderContext> {
    this.logger.debug(`Creating order record: ${context.orderNumber}`);

    const order = await this.prisma.order.create({
      data: {
        outletId: context.outletId,
        orderNumber: context.orderNumber,
        orderType: context.orderType as 'dine_in' | 'takeaway' | 'delivery',
        tableId: context.tableId,
        customerId: context.customerId,
        status: 'pending',
        items: {
          create: context.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            quantity: item.quantity,
            station: item.station,
            notes: item.notes,
            status: 'pending',
          })),
        },
      },
    });

    return { ...context, orderId: order.id };
  }

  async compensate(context: CreateOrderContext): Promise<CreateOrderContext> {
    if (context.orderId) {
      this.logger.debug(`Compensating: deleting order ${context.orderId}`);

      // Delete order items first, then order
      await this.prisma.orderItem.deleteMany({
        where: { orderId: context.orderId },
      });
      await this.prisma.order.delete({
        where: { id: context.orderId },
      });
    }

    return { ...context, orderId: undefined };
  }
}

// ==================== Step 3: Deduct Ingredient Stock ====================

export class DeductIngredientStockStep implements SagaStep<CreateOrderContext> {
  readonly name = 'deduct-ingredient-stock';
  private readonly logger = new Logger(DeductIngredientStockStep.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: CreateOrderContext): Promise<CreateOrderContext> {
    this.logger.debug('Deducting ingredient stock for order');

    const deductedIngredients: CreateOrderContext['deductedIngredients'] = [];

    for (const item of context.items) {
      const recipe = await this.prisma.recipe.findFirst({
        where: {
          productId: item.productId,
          ...(item.variantId ? { variantId: item.variantId } : {}),
        },
        include: { items: true },
      });

      if (!recipe) continue;

      for (const recipeItem of recipe.items) {
        const qtyNeeded = Number(recipeItem.quantity) * item.quantity;

        const stockLevel = await this.prisma.ingredientStockLevel.findFirst({
          where: {
            outletId: context.outletId,
            ingredientId: recipeItem.ingredientId,
          },
        });

        if (!stockLevel) continue;

        const newQty = Math.max(0, Number(stockLevel.quantity) - qtyNeeded);

        await this.prisma.ingredientStockLevel.update({
          where: { id: stockLevel.id },
          data: { quantity: newQty },
        });

        const movement = await this.prisma.ingredientStockMovement.create({
          data: {
            outletId: context.outletId,
            ingredientId: recipeItem.ingredientId,
            movementType: 'usage',
            quantity: -qtyNeeded,
            referenceId: context.orderId,
            referenceType: 'order',
          },
        });

        deductedIngredients.push({
          ingredientId: recipeItem.ingredientId,
          outletId: context.outletId,
          quantity: qtyNeeded,
          stockLevelId: stockLevel.id,
          movementId: movement.id,
        });
      }
    }

    return { ...context, ingredientsDeducted: true, deductedIngredients };
  }

  async compensate(context: CreateOrderContext): Promise<CreateOrderContext> {
    if (context.deductedIngredients) {
      this.logger.debug(
        `Compensating: restoring ${context.deductedIngredients.length} ingredient deductions`,
      );

      for (const deduction of context.deductedIngredients) {
        // Restore stock
        const current = await this.prisma.ingredientStockLevel.findUnique({
          where: { id: deduction.stockLevelId },
        });

        if (current) {
          await this.prisma.ingredientStockLevel.update({
            where: { id: deduction.stockLevelId },
            data: { quantity: Number(current.quantity) + deduction.quantity },
          });
        }

        // Remove the movement record
        await this.prisma.ingredientStockMovement.delete({
          where: { id: deduction.movementId },
        });
      }
    }

    return {
      ...context,
      ingredientsDeducted: false,
      deductedIngredients: undefined,
    };
  }
}

// ==================== Step 4: Send to KDS ====================

export class SendToKdsStep implements SagaStep<CreateOrderContext> {
  readonly name = 'send-to-kds';
  private readonly logger = new Logger(SendToKdsStep.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: CreateOrderContext): Promise<CreateOrderContext> {
    if (!context.orderId) {
      throw new Error('Cannot send to KDS without an order ID');
    }

    this.logger.debug(`Sending order ${context.orderId} to KDS`);

    // Update order status to confirmed (triggers KDS display via event bus)
    await this.prisma.order.update({
      where: { id: context.orderId },
      data: { status: 'confirmed' },
    });

    // Update all items to pending (ready for kitchen to pick up)
    await this.prisma.orderItem.updateMany({
      where: { orderId: context.orderId },
      data: { status: 'pending' },
    });

    return { ...context, kdsSent: true };
  }

  async compensate(context: CreateOrderContext): Promise<CreateOrderContext> {
    if (context.orderId && context.kdsSent) {
      this.logger.debug(`Compensating: reverting KDS status for order ${context.orderId}`);

      // Revert order status back to cancelled
      await this.prisma.order.update({
        where: { id: context.orderId },
        data: { status: 'cancelled' },
      });
    }

    return { ...context, kdsSent: false };
  }
}

// ==================== Factory ====================

/**
 * Create all saga steps for the CreateOrder saga.
 * Pass a PrismaService instance to construct all steps.
 */
export function createOrderSagaSteps(prisma: PrismaService): SagaStep<CreateOrderContext>[] {
  return [
    new ValidateStockStep(prisma),
    new CreateOrderRecordStep(prisma),
    new DeductIngredientStockStep(prisma),
    new SendToKdsStep(prisma),
  ];
}
