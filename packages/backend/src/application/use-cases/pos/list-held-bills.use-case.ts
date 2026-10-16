import { Injectable } from '@nestjs/common';
import { HeldBillStore } from '@infrastructure/cache/held-bill.store';

@Injectable()
export class ListHeldBillsUseCase {
  constructor(private readonly heldBillStore: HeldBillStore) {}

  execute(businessId: string, outletId: string, cursor?: string) {
    return this.heldBillStore.list(businessId, outletId, cursor);
  }

  discard(businessId: string, outletId: string, billId: string): Promise<void> {
    return this.heldBillStore.discard(businessId, outletId, billId);
  }
}
