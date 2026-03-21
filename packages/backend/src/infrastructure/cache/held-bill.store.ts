import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';
import { CACHE_KEYS, CACHE_DEFAULTS, buildCacheKey } from './cache.constants';

export interface HeldBillData {
  id: string;
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
    productName?: string;
    modifierIds?: string[];
  }>;
  notes?: string;
  subtotal?: number;
  heldAt: string;
}

@Injectable()
export class HeldBillStore {
  constructor(private readonly redis: RedisService) {}

  async hold(data: HeldBillData): Promise<void> {
    const key = buildCacheKey(CACHE_KEYS.HELD_BILL, data.outletId, data.id);
    await this.redis.set(key, data, CACHE_DEFAULTS.HELD_BILL_TTL);

    const listKey = buildCacheKey(CACHE_KEYS.HELD_BILL, data.outletId, 'list');
    const list = (await this.redis.get<string[]>(listKey)) || [];
    if (!list.includes(data.id)) {
      list.push(data.id);
      await this.redis.set(listKey, list, CACHE_DEFAULTS.HELD_BILL_TTL);
    }
  }

  async resume(outletId: string, billId: string): Promise<HeldBillData | null> {
    const key = buildCacheKey(CACHE_KEYS.HELD_BILL, outletId, billId);
    // Atomic get-and-delete to prevent two cashiers resuming the same bill
    const data = await this.redis.getdel<HeldBillData>(key);
    if (data) {
      const listKey = buildCacheKey(CACHE_KEYS.HELD_BILL, outletId, 'list');
      const list = (await this.redis.get<string[]>(listKey)) || [];
      const filtered = list.filter((id) => id !== billId);
      await this.redis.set(listKey, filtered, CACHE_DEFAULTS.HELD_BILL_TTL);
    }
    return data;
  }

  async list(outletId: string): Promise<HeldBillData[]> {
    const listKey = buildCacheKey(CACHE_KEYS.HELD_BILL, outletId, 'list');
    const ids = (await this.redis.get<string[]>(listKey)) || [];
    const bills: HeldBillData[] = [];
    const validIds: string[] = [];
    for (const id of ids) {
      const key = buildCacheKey(CACHE_KEYS.HELD_BILL, outletId, id);
      const data = await this.redis.get<HeldBillData>(key);
      if (data) {
        bills.push(data);
        validIds.push(id);
      }
    }
    // Clean up orphaned IDs whose bill data has expired
    if (validIds.length < ids.length) {
      await this.redis.set(listKey, validIds, CACHE_DEFAULTS.HELD_BILL_TTL);
    }
    return bills;
  }
}
