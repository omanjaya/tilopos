import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { HeldBillStore } from '@infrastructure/cache/held-bill.store';

export interface HoldBillInput {
  outletId: string;
  employeeId: string;
  tableId?: string;
  customerName?: string;
  items: Array<{ productId: string; variantId?: string; quantity: number; notes?: string }>;
  notes?: string;
}

@Injectable()
export class HoldBillUseCase {
  constructor(private readonly heldBillStore: HeldBillStore) {}

  async execute(input: HoldBillInput): Promise<{ billId: string }> {
    const billId = randomUUID();
    await this.heldBillStore.hold({
      id: billId,
      outletId: input.outletId,
      employeeId: input.employeeId,
      tableId: input.tableId,
      customerName: input.customerName,
      items: input.items,
      notes: input.notes,
      heldAt: new Date().toISOString(),
    });
    return { billId };
  }
}
