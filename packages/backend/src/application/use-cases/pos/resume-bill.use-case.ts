import { Injectable, NotFoundException } from '@nestjs/common';
import { HeldBillStore, HeldBillData } from '@infrastructure/cache/held-bill.store';

export interface ResumeBillInput {
  outletId: string;
  billId: string;
}

@Injectable()
export class ResumeBillUseCase {
  constructor(private readonly heldBillStore: HeldBillStore) {}

  async execute(input: ResumeBillInput): Promise<HeldBillData> {
    const bill = await this.heldBillStore.resume(input.outletId, input.billId);
    if (!bill) {
      throw new NotFoundException('Held bill not found or already resumed');
    }
    return bill;
  }
}
