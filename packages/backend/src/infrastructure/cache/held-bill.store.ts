import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type Redis from 'ioredis';
import { CACHE_KEYS, buildCacheKey } from './cache.constants';

export interface HeldBillItem {
  productId?: string;
  bundleId?: string;
  variantId?: string;
  quantity: number;
  notes?: string;
  /** Server price excluding modifiers; all display values come from pricing. */
  unitPrice?: number;
  originalPrice?: number;
  productName?: string;
  variantName?: string;
  modifierIds?: string[];
  modifiers?: { id: string; name: string; price: number }[];
}

export interface HeldBillData {
  id: string;
  businessId: string;
  outletId: string;
  employeeId: string;
  tableId?: string;
  tableName?: string;
  customerId?: string;
  customerName?: string;
  orderType?: 'dine_in' | 'takeaway' | 'delivery';
  discountAmount?: number;
  discountPercent?: number;
  discountTotal?: number;
  items: HeldBillItem[];
  notes?: string;
  subtotal?: number;
  heldAt: string;
  requestHash?: string;
}

/** Atomic scripts preserve a retry receipt instead of losing a bill on a lost response. */
const HOLD = `
if redis.call('EXISTS', KEYS[3]) == 1 then return -1 end
local old = redis.call('GET', KEYS[1])
if old then
  local saved = cjson.decode(old)
  local incoming = cjson.decode(ARGV[2])
  if saved.requestHash ~= incoming.requestHash or saved.employeeId ~= incoming.employeeId then return -1 end
  redis.call('PERSIST', KEYS[1])
  redis.call('PERSIST', KEYS[2])
  return 0
end
redis.call('SET', KEYS[1], ARGV[2])
redis.call('SADD', KEYS[2], ARGV[1])
redis.call('PERSIST', KEYS[2])
return 1
`;
const RESUME = `
local receipt = redis.call('GET', KEYS[3])
if receipt then
  local saved = cjson.decode(receipt)
  if saved.requestId == ARGV[2] and saved.employeeId == ARGV[3] then return saved.bill end
  return nil
end
local raw = redis.call('GET', KEYS[1])
if not raw then return nil end
redis.call('SET', KEYS[3], cjson.encode({requestId=ARGV[2], employeeId=ARGV[3], bill=raw}))
redis.call('DEL', KEYS[1])
redis.call('SREM', KEYS[2], ARGV[1])
return raw
`;
const DISCARD = `
if redis.call('EXISTS', KEYS[3]) == 1 then return 0 end
redis.call('SET', KEYS[3], '{}')
redis.call('DEL', KEYS[1])
redis.call('SREM', KEYS[2], ARGV[1])
return 1
`;

@Injectable()
export class HeldBillStore {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  private billKey(businessId: string, outletId: string, billId: string): string {
    return buildCacheKey(CACHE_KEYS.HELD_BILL, businessId, outletId, billId);
  }
  private keys(businessId: string, outletId: string, billId: string): string[] {
    return [
      this.billKey(businessId, outletId, billId),
      this.billKey(businessId, outletId, 'index'),
      this.billKey(businessId, outletId, `consumed:${billId}`),
    ];
  }

  async hold(data: HeldBillData): Promise<void> {
    const result = await this.redis.eval(
      HOLD,
      3,
      ...this.keys(data.businessId, data.outletId, data.id),
      data.id,
      JSON.stringify(data),
    );
    if (result === -1)
      throw new ConflictException('Held bill already consumed or id used by another request');
  }

  async resume(
    businessId: string,
    outletId: string,
    billId: string,
    requestId: string = randomUUID(),
    employeeId = '',
  ): Promise<HeldBillData | null> {
    const raw = await this.redis.eval(
      RESUME,
      3,
      ...this.keys(businessId, outletId, billId),
      billId,
      requestId,
      employeeId,
    );
    return typeof raw === 'string' ? (JSON.parse(raw) as HeldBillData) : null;
  }

  async discard(businessId: string, outletId: string, billId: string): Promise<void> {
    await this.redis.eval(DISCARD, 3, ...this.keys(businessId, outletId, billId), billId);
  }

  async list(
    businessId: string,
    outletId: string,
    cursor = '0',
  ): Promise<{ bills: HeldBillData[]; cursor: string }> {
    const indexKey = this.billKey(businessId, outletId, 'index');
    const [next, ids] = await this.redis.sscan(indexKey, cursor, 'COUNT', 100);
    if (ids.length === 0) return { bills: [], cursor: next };
    const values = await this.redis.mget(
      ...ids.map((id) => this.billKey(businessId, outletId, id)),
    );
    const bills: HeldBillData[] = [];
    const expired: string[] = [];
    values.forEach((raw, i) => {
      if (raw) bills.push(JSON.parse(raw) as HeldBillData);
      else expired.push(ids[i]);
    });
    if (expired.length > 0) await this.redis.srem(indexKey, ...expired);
    // Preserve still-live records created by older releases with a 24h TTL.
    const persist = this.redis.pipeline().persist(indexKey);
    for (const bill of bills) persist.persist(this.billKey(businessId, outletId, bill.id));
    const results = await persist.exec();
    const failure = results?.find(([error]) => error)?.[0];
    if (failure) throw failure;
    return { bills: bills.sort((a, b) => a.heldAt.localeCompare(b.heldAt)), cursor: next };
  }
}
