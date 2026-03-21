import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface CalculateMovingAverageCostInput {
  productId?: string;
  variantId?: string;
  outletId: string;
  existingQuantity: number;
  newQuantity: number;
  newUnitCost: number;
  referenceId?: string;
  referenceType?: string;
  employeeId?: string;
}

export interface CalculateMovingAverageCostOutput {
  previousCost: number;
  newCost: number;
  costPriceHistoryId: string;
}

@Injectable()
export class CalculateMovingAverageCostUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: CalculateMovingAverageCostInput): Promise<CalculateMovingAverageCostOutput> {
    const { productId, variantId, existingQuantity, newQuantity, newUnitCost } = input;

    // Get current costPrice
    let previousCost = 0;
    if (variantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: variantId },
        select: { costPrice: true },
      });
      previousCost = variant?.costPrice?.toNumber() ?? 0;
    } else if (productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { costPrice: true },
      });
      previousCost = product?.costPrice?.toNumber() ?? 0;
    }

    // Calculate moving average
    let newCost: number;
    const totalQuantity = existingQuantity + newQuantity;

    if (totalQuantity <= 0) {
      // Edge case: no stock after operation, keep current cost
      newCost = previousCost;
    } else if (previousCost === 0 && existingQuantity === 0) {
      // First time receiving stock, use incoming cost directly
      newCost = newUnitCost;
    } else {
      // Weighted moving average formula
      newCost = (existingQuantity * previousCost + newQuantity * newUnitCost) / totalQuantity;
    }

    // Round to 4 decimal places
    newCost = Math.round(newCost * 10000) / 10000;

    // Update costPrice on product or variant
    if (variantId) {
      await this.prisma.productVariant.update({
        where: { id: variantId },
        data: { costPrice: new Decimal(newCost) },
      });
    } else if (productId) {
      await this.prisma.product.update({
        where: { id: productId },
        data: { costPrice: new Decimal(newCost) },
      });
    }

    // Create cost price history record
    const history = await this.prisma.costPriceHistory.create({
      data: {
        productId: productId || null,
        variantId: variantId || null,
        previousCost: new Decimal(previousCost),
        newCost: new Decimal(newCost),
        quantityBefore: new Decimal(existingQuantity),
        quantityAdded: new Decimal(newQuantity),
        unitCostAdded: new Decimal(newUnitCost),
        referenceId: input.referenceId || null,
        referenceType: input.referenceType || null,
        createdBy: input.employeeId || null,
      },
    });

    return {
      previousCost,
      newCost,
      costPriceHistoryId: history.id,
    };
  }
}
