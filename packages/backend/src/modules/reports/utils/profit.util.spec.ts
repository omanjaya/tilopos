import { computeProfit } from './profit.util';

describe('computeProfit', () => {
  it('subtracts discounts once and refunds once, ignoring tax', () => {
    // subtotal 1,000,000; discount 100,000; refunds 50,000; COGS 400,000
    const r = computeProfit({
      grossSales: 1_000_000,
      discounts: 100_000,
      refunds: 50_000,
      cogs: 400_000,
    });
    expect(r.netRevenue).toBe(850_000);
    expect(r.expenses).toBe(400_000);
    expect(r.netProfit).toBe(450_000);
    expect(r.profitMargin).toBeCloseTo(52.94, 2);
  });

  it('expenses are COGS only (purchase orders are never added)', () => {
    const r = computeProfit({ grossSales: 100, discounts: 0, refunds: 0, cogs: 30 });
    expect(r.expenses).toBe(30);
    expect(r.netProfit).toBe(70);
  });

  it('is exact for decimal inputs and handles zero revenue', () => {
    expect(
      computeProfit({ grossSales: '0.3', discounts: '0.1', refunds: '0.2', cogs: 0 }).netRevenue,
    ).toBe(0);
    expect(computeProfit({ grossSales: 0, discounts: 0, refunds: 0, cogs: 10 }).profitMargin).toBe(
      0,
    );
  });
});
