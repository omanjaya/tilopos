import { money, percentOf, roundRupiah, sumMoney, toNumber, nonNegative } from './money';

describe('money', () => {
  it('sums without float drift', () => {
    expect(toNumber(sumMoney([0.1, 0.2]))).toBe(0.3);
  });

  it('rounds half up to whole rupiah', () => {
    expect(toNumber(roundRupiah(1500.5))).toBe(1501);
    expect(toNumber(roundRupiah(percentOf(10999, 11)))).toBe(1210);
  });

  it('treats null/undefined as zero and clamps negatives', () => {
    expect(toNumber(money(undefined))).toBe(0);
    expect(toNumber(nonNegative(-5))).toBe(0);
  });
});
