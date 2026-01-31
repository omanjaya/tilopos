import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface DeductIngredientsInput {
  outletId: string;
  transactionId: string;
  items: {
    productId: string;
    variantId?: string;
    quantity: number;
  }[];
}

export interface DeductIngredientsOutput {
  deductions: {
    ingredientId: string;
    ingredientName: string;
    quantityDeducted: number;
    remainingStock: number;
    isBelowAlert: boolean;
  }[];
}

@Injectable()
export class DeductIngredientsOnSaleUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: DeductIngredientsInput): Promise<DeductIngredientsOutput> {
    const deductions: DeductIngredientsOutput['deductions'] = [];

    for (const item of input.items) {
      const recipe = await this.prisma.recipe.findFirst({
        where: { productId: item.productId, variantId: item.variantId || null },
        include: { items: { include: { ingredient: true } } },
      });

      if (!recipe) continue;

      for (const recipeItem of recipe.items) {
        const qtyNeeded = recipeItem.quantity.toNumber() * item.quantity;

        const stockLevel = await this.prisma.ingredientStockLevel.findFirst({
          where: { outletId: input.outletId, ingredientId: recipeItem.ingredientId },
        });

        if (!stockLevel) continue;

        const newQty = stockLevel.quantity.toNumber() - qtyNeeded;

        await this.prisma.ingredientStockLevel.update({
          where: { id: stockLevel.id },
          data: { quantity: Math.max(0, newQty) },
        });

        await this.prisma.ingredientStockMovement.create({
          data: {
            outletId: input.outletId,
            ingredientId: recipeItem.ingredientId,
            movementType: 'usage',
            quantity: -qtyNeeded,
            referenceId: input.transactionId,
            referenceType: 'transaction',
          },
        });

        deductions.push({
          ingredientId: recipeItem.ingredientId,
          ingredientName: recipeItem.ingredient.name,
          quantityDeducted: qtyNeeded,
          remainingStock: Math.max(0, newQty),
          isBelowAlert: newQty <= stockLevel.lowStockAlert.toNumber(),
        });
      }
    }

    return { deductions };
  }
}
