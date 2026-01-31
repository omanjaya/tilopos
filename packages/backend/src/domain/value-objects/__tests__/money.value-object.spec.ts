import { Money } from '../money';

describe('Money Value Object', () => {
  describe('creation', () => {
    it('should create Money with valid amount and default currency IDR', () => {
      const money = Money.create(10000);

      expect(money.amount).toBe(10000);
      expect(money.currency).toBe('IDR');
    });

    it('should create Money with valid amount and explicit currency', () => {
      const money = Money.create(100, 'USD');

      expect(money.amount).toBe(100);
      expect(money.currency).toBe('USD');
    });

    it('should create Money with zero amount', () => {
      const money = Money.create(0);

      expect(money.amount).toBe(0);
      expect(money.currency).toBe('IDR');
    });

    it('should throw error when amount is negative', () => {
      expect(() => Money.create(-1000)).toThrow('Money amount cannot be negative');
    });

    it('should throw error when amount is negative fractional', () => {
      expect(() => Money.create(-0.01)).toThrow('Money amount cannot be negative');
    });
  });

  describe('zero factory', () => {
    it('should create zero Money with default currency IDR', () => {
      const money = Money.zero();

      expect(money.amount).toBe(0);
      expect(money.currency).toBe('IDR');
    });

    it('should create zero Money with specified currency', () => {
      const money = Money.zero('USD');

      expect(money.amount).toBe(0);
      expect(money.currency).toBe('USD');
    });
  });

  describe('addition', () => {
    it('should add two Money objects with same currency', () => {
      const a = Money.create(25000);
      const b = Money.create(15000);

      const result = a.add(b);

      expect(result.amount).toBe(40000);
      expect(result.currency).toBe('IDR');
    });

    it('should add Money to zero', () => {
      const a = Money.create(50000);
      const zero = Money.zero();

      const result = a.add(zero);

      expect(result.amount).toBe(50000);
    });

    it('should add zero to Money', () => {
      const zero = Money.zero();
      const a = Money.create(50000);

      const result = zero.add(a);

      expect(result.amount).toBe(50000);
    });

    it('should throw error when adding different currencies', () => {
      const idr = Money.create(10000, 'IDR');
      const usd = Money.create(100, 'USD');

      expect(() => idr.add(usd)).toThrow('Currency mismatch: IDR vs USD');
    });
  });

  describe('subtraction', () => {
    it('should subtract two Money objects with same currency', () => {
      const a = Money.create(50000);
      const b = Money.create(20000);

      const result = a.subtract(b);

      expect(result.amount).toBe(30000);
      expect(result.currency).toBe('IDR');
    });

    it('should subtract to zero', () => {
      const a = Money.create(25000);
      const b = Money.create(25000);

      const result = a.subtract(b);

      expect(result.amount).toBe(0);
    });

    it('should throw error when result is negative', () => {
      const a = Money.create(10000);
      const b = Money.create(20000);

      expect(() => a.subtract(b)).toThrow('Money amount cannot be negative');
    });

    it('should throw error when subtracting different currencies', () => {
      const idr = Money.create(50000, 'IDR');
      const usd = Money.create(10, 'USD');

      expect(() => idr.subtract(usd)).toThrow('Currency mismatch: IDR vs USD');
    });
  });

  describe('multiplication', () => {
    it('should multiply Money by a positive integer', () => {
      const price = Money.create(25000);

      const result = price.multiply(3);

      expect(result.amount).toBe(75000);
      expect(result.currency).toBe('IDR');
    });

    it('should multiply Money by zero', () => {
      const price = Money.create(25000);

      const result = price.multiply(0);

      expect(result.amount).toBe(0);
    });

    it('should multiply Money by a fractional factor and round', () => {
      const price = Money.create(33333);

      const result = price.multiply(0.1);

      // Math.round(33333 * 0.1) = Math.round(3333.3) = 3333
      expect(result.amount).toBe(3333);
    });

    it('should round correctly for tax calculation (11% PPN)', () => {
      const subtotal = Money.create(50000);

      const tax = subtotal.multiply(0.11);

      // Math.round(50000 * 0.11) = Math.round(5500) = 5500
      expect(tax.amount).toBe(5500);
    });

    it('should round correctly when fractional result is above .5', () => {
      const price = Money.create(10001);

      const result = price.multiply(0.11);

      // Math.round(10001 * 0.11) = Math.round(1100.11) = 1100
      expect(result.amount).toBe(1100);
    });

    it('should multiply by 1 and return same amount', () => {
      const price = Money.create(25000);

      const result = price.multiply(1);

      expect(result.amount).toBe(25000);
    });
  });

  describe('comparison - equals', () => {
    it('should return true for same amount and currency', () => {
      const a = Money.create(25000, 'IDR');
      const b = Money.create(25000, 'IDR');

      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different amounts', () => {
      const a = Money.create(25000);
      const b = Money.create(30000);

      expect(a.equals(b)).toBe(false);
    });

    it('should return false for different currencies even if same amount', () => {
      const a = Money.create(100, 'IDR');
      const b = Money.create(100, 'USD');

      expect(a.equals(b)).toBe(false);
    });

    it('should return true for two zero Money with same currency', () => {
      const a = Money.zero('IDR');
      const b = Money.zero('IDR');

      expect(a.equals(b)).toBe(true);
    });
  });

  describe('comparison - isGreaterThan', () => {
    it('should return true when amount is greater', () => {
      const a = Money.create(50000);
      const b = Money.create(25000);

      expect(a.isGreaterThan(b)).toBe(true);
    });

    it('should return false when amounts are equal', () => {
      const a = Money.create(25000);
      const b = Money.create(25000);

      expect(a.isGreaterThan(b)).toBe(false);
    });

    it('should return false when amount is less', () => {
      const a = Money.create(10000);
      const b = Money.create(25000);

      expect(a.isGreaterThan(b)).toBe(false);
    });

    it('should throw error when comparing different currencies', () => {
      const idr = Money.create(50000, 'IDR');
      const usd = Money.create(10, 'USD');

      expect(() => idr.isGreaterThan(usd)).toThrow('Currency mismatch: IDR vs USD');
    });
  });

  describe('comparison - isLessThan', () => {
    it('should return true when amount is less', () => {
      const a = Money.create(10000);
      const b = Money.create(25000);

      expect(a.isLessThan(b)).toBe(true);
    });

    it('should return false when amounts are equal', () => {
      const a = Money.create(25000);
      const b = Money.create(25000);

      expect(a.isLessThan(b)).toBe(false);
    });

    it('should return false when amount is greater', () => {
      const a = Money.create(50000);
      const b = Money.create(25000);

      expect(a.isLessThan(b)).toBe(false);
    });

    it('should throw error when comparing different currencies', () => {
      const idr = Money.create(10000, 'IDR');
      const usd = Money.create(50, 'USD');

      expect(() => idr.isLessThan(usd)).toThrow('Currency mismatch: IDR vs USD');
    });
  });

  describe('immutability', () => {
    it('should not mutate original Money on add', () => {
      const original = Money.create(25000);
      const other = Money.create(10000);

      original.add(other);

      expect(original.amount).toBe(25000);
    });

    it('should not mutate original Money on subtract', () => {
      const original = Money.create(25000);
      const other = Money.create(10000);

      original.subtract(other);

      expect(original.amount).toBe(25000);
    });

    it('should not mutate original Money on multiply', () => {
      const original = Money.create(25000);

      original.multiply(3);

      expect(original.amount).toBe(25000);
    });
  });
});
