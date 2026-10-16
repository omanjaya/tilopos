import { describe, it, expect } from 'vitest';
import { roundCash, toDiscountRequests, toItemRequests, toPreviewRequest } from './cart-request';
import type { CartItem } from '@/types/pos.types';

const item = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: 'c1',
  productId: 'p1',
  name: 'Kopi',
  price: 15000,
  quantity: 2,
  modifiers: [{ id: 'm1', name: 'Less sugar', price: 0 }],
  ...overrides,
});

describe('cart-request (POST /pos/transactions[/preview] body)', () => {
  it('rounds cash totals to Rp500 half-up like the backend', () => {
    expect(roundCash(12249)).toBe(12000);
    expect(roundCash(12250)).toBe(12500);
    expect(roundCash(12300)).toBe(12500);
  });

  it('sends unitPrice only for price-editing roles when the price was changed', () => {
    const edited = item({ originalPrice: 15000, price: 12000 });
    expect(toItemRequests([edited], false)[0]!.unitPrice).toBeUndefined();
    expect(toItemRequests([edited], true)[0]!.unitPrice).toBe(12000);
    expect(toItemRequests([item()], true)[0]!.unitPrice).toBeUndefined();
  });

  it('sends bundles without productId and modifiers as ids', () => {
    const [req] = toItemRequests([item({ bundleId: 'b1' })], false);
    expect(req).toMatchObject({ productId: undefined, bundleId: 'b1', modifierIds: ['m1'] });
  });

  it('maps the manual discount (percent wins) or omits it', () => {
    expect(toDiscountRequests(0, 0)).toBeUndefined();
    expect(toDiscountRequests(5000, 0)).toEqual([{ type: 'fixed', value: 5000 }]);
    expect(toDiscountRequests(5000, 10)).toEqual([{ type: 'percentage', value: 10 }]);
  });

  it('builds the preview body with optional payments', () => {
    const body = toPreviewRequest(
      { items: [item()], orderType: 'takeaway', customerId: undefined, discountAmount: 0, discountPercent: 0 },
      '',
      false,
      [{ method: 'cash', amount: 30000 }],
    );
    expect(body.outletId).toBeUndefined();
    expect(body.orderType).toBe('takeaway');
    expect(body.payments).toEqual([{ method: 'cash', amount: 30000 }]);
    expect(body.discounts).toBeUndefined();
  });
});
