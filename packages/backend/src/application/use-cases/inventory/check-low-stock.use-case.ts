import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import type { IInventoryRepository } from '@domain/interfaces/repositories/inventory.repository';
import type { IProductRepository } from '@domain/interfaces/repositories/product.repository';

export interface CheckLowStockInput {
  outletId: string;
  businessId: string;
}

export interface LowStockItem {
  productId: string;
  productName: string;
  currentQuantity: number;
  lowStockAlert: number;
}

export interface CheckLowStockOutput {
  outletId: string;
  lowStockItems: LowStockItem[];
  totalLowStockCount: number;
}

@Injectable()
export class CheckLowStockUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.INVENTORY)
    private readonly inventoryRepo: IInventoryRepository,
    @Inject(REPOSITORY_TOKENS.PRODUCT)
    private readonly productRepo: IProductRepository,
  ) {}

  async execute(input: CheckLowStockInput): Promise<CheckLowStockOutput> {
    const lowStockRecords = await this.inventoryRepo.findLowStockItems(input.outletId);

    const lowStockItems: LowStockItem[] = [];

    for (const stockRecord of lowStockRecords) {
      if (!stockRecord.productId) continue;

      const product = await this.productRepo.findById(stockRecord.productId);
      if (!product || !product.isActive) continue;

      lowStockItems.push({
        productId: stockRecord.productId,
        productName: product.name,
        currentQuantity: stockRecord.quantity,
        lowStockAlert: stockRecord.lowStockAlert,
      });
    }

    return {
      outletId: input.outletId,
      lowStockItems,
      totalLowStockCount: lowStockItems.length,
    };
  }
}
