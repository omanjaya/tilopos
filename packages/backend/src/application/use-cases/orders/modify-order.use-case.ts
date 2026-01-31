import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { AppError } from '@shared/errors/app-error';
import { ErrorCode } from '@shared/constants/error-codes';
import type { IOrderRepository } from '@domain/interfaces/repositories/order.repository';

export interface ModifyOrderItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
  station?: string;
  notes?: string;
}

export interface ModifyOrderInput {
  orderId: string;
  employeeId: string;
  addItems?: ModifyOrderItemInput[];
  removeItemIds?: string[];
  updateItems?: Array<{ itemId: string; quantity?: number; notes?: string }>;
  notes?: string;
  priority?: number;
}

export interface ModifyOrderOutput {
  orderId: string;
  itemsAdded: number;
  itemsRemoved: number;
  itemsUpdated: number;
}

@Injectable()
export class ModifyOrderUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.ORDER)
    private readonly orderRepo: IOrderRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: ModifyOrderInput): Promise<ModifyOrderOutput> {
    const order = await this.orderRepo.findById(input.orderId);
    if (!order) {
      throw new AppError(ErrorCode.ORDER_NOT_FOUND, `Order ${input.orderId} not found`);
    }

    const modifiableStatuses = ['pending', 'confirmed'];
    if (!modifiableStatuses.includes(order.status)) {
      throw new AppError(
        ErrorCode.ORDER_NOT_FOUND,
        `Cannot modify order in status: ${order.status}`,
      );
    }

    let itemsAdded = 0;
    let itemsRemoved = 0;
    let itemsUpdated = 0;

    // Add new items
    if (input.addItems && input.addItems.length > 0) {
      const productIds = input.addItems.map((i) => i.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds }, isActive: true },
      });

      for (const item of input.addItems) {
        const product = products.find((p) => p.id === item.productId);
        await this.prisma.orderItem.create({
          data: {
            orderId: input.orderId,
            productId: item.productId,
            variantId: item.variantId || null,
            productName: product?.name || 'Unknown',
            quantity: item.quantity,
            station: item.station || null,
            notes: item.notes || null,
            status: 'pending',
          },
        });
        itemsAdded++;
      }
    }

    // Remove items
    if (input.removeItemIds && input.removeItemIds.length > 0) {
      const deleteResult = await this.prisma.orderItem.deleteMany({
        where: {
          id: { in: input.removeItemIds },
          orderId: input.orderId,
          status: 'pending',
        },
      });
      itemsRemoved = deleteResult.count;
    }

    // Update existing items
    if (input.updateItems && input.updateItems.length > 0) {
      for (const update of input.updateItems) {
        const updateData: Record<string, unknown> = {};
        if (update.quantity !== undefined) updateData.quantity = update.quantity;
        if (update.notes !== undefined) updateData.notes = update.notes;

        await this.prisma.orderItem.updateMany({
          where: { id: update.itemId, orderId: input.orderId },
          data: updateData,
        });
        itemsUpdated++;
      }
    }

    // Update order-level fields
    const orderUpdate: Record<string, unknown> = {};
    if (input.notes !== undefined) orderUpdate.notes = input.notes;
    if (input.priority !== undefined) orderUpdate.priority = input.priority;

    if (Object.keys(orderUpdate).length > 0) {
      await this.orderRepo.update(input.orderId, orderUpdate);
    }

    return {
      orderId: input.orderId,
      itemsAdded,
      itemsRemoved,
      itemsUpdated,
    };
  }
}
