import { Injectable } from '@nestjs/common';
import { HeldBillStore, HeldBillData } from '@infrastructure/cache/held-bill.store';

@Injectable()
export class ListHeldBillsUseCase {
  constructor(private readonly heldBillStore: HeldBillStore) {}

  async execute(outletId: string): Promise<HeldBillData[]> {
    return this.heldBillStore.list(outletId);
  }
}
