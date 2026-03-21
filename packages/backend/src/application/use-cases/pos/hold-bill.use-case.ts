import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { HeldBillStore } from '@infrastructure/cache/held-bill.store';
import { REPOSITORY_TOKENS } from '@infrastructure/repositories/repository.tokens';
import type { IProductRepository } from '@domain/interfaces/repositories/product.repository';

export interface HoldBillInput {
  outletId: string;
  employeeId: string;
  tableId?: string;
  customerName?: string;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    notes?: string;
    unitPrice?: number;
    modifierIds?: string[];
  }>;
  notes?: string;
}

@Injectable()
export class HoldBillUseCase {
  constructor(
    private readonly heldBillStore: HeldBillStore,
    @Inject(REPOSITORY_TOKENS.PRODUCT)
    private readonly productRepo: IProductRepository,
  ) {}

  async execute(input: HoldBillInput): Promise<{ billId: string }> {
    const billId = randomUUID();

    // Snapshot current prices so they are preserved on resume
    const itemsWithPrices = await Promise.all(
      input.items.map(async (item) => {
        if (item.unitPrice !== undefined) {
          return item;
        }
        const product = await this.productRepo.findById(item.productId);
        return {
          ...item,
          unitPrice: product ? Number(product.basePrice) : 0,
          productName: product?.name,
        };
      }),
    );

    const subtotal = itemsWithPrices.reduce(
      (sum, item) => sum + (item.unitPrice ?? 0) * item.quantity,
      0,
    );

    await this.heldBillStore.hold({
      id: billId,
      outletId: input.outletId,
      employeeId: input.employeeId,
      tableId: input.tableId,
      customerName: input.customerName,
      items: itemsWithPrices,
      notes: input.notes,
      subtotal,
      heldAt: new Date().toISOString(),
    });
    return { billId };
  }
}
