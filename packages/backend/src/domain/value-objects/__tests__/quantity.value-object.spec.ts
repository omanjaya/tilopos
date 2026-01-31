import { Quantity } from '../quantity';

describe('Quantity Value Object', () => {
  describe('creation', () => {
    it('should create Quantity with valid positive value', () => {
      const qty = Quantity.create(10);

      expect(qty.value).toBe(10);
    });

    it('should create Quantity with zero', () => {
      const qty = Quantity.create(0);

      expect(qty.value).toBe(0);
    });

    it('should create Quantity with fractional value', () => {
      const qty = Quantity.create(2.5);

      expect(qty.value).toBe(2.5);
    });

    it('should throw error when value is negative', () => {
      expect(() => Quantity.create(-1)).toThrow('Quantity cannot be negative');
    });

    it('should throw error when value is negative fractional', () => {
      expect(() => Quantity.create(-0.5)).toThrow('Quantity cannot be negative');
    });
  });

  describe('zero factory', () => {
    it('should create zero Quantity', () => {
      const qty = Quantity.zero();

      expect(qty.value).toBe(0);
    });
  });

  describe('addition', () => {
    it('should add two Quantity objects', () => {
      const a = Quantity.create(5);
      const b = Quantity.create(3);

      const result = a.add(b);

      expect(result.value).toBe(8);
    });

    it('should add Quantity to zero', () => {
      const a = Quantity.create(10);
      const zero = Quantity.zero();

      const result = a.add(zero);

      expect(result.value).toBe(10);
    });

    it('should add zero to Quantity', () => {
      const zero = Quantity.zero();
      const a = Quantity.create(7);

      const result = zero.add(a);

      expect(result.value).toBe(7);
    });

    it('should add fractional quantities', () => {
      const a = Quantity.create(1.5);
      const b = Quantity.create(2.3);

      const result = a.add(b);

      expect(result.value).toBeCloseTo(3.8);
    });
  });

  describe('subtraction', () => {
    it('should subtract two Quantity objects', () => {
      const a = Quantity.create(10);
      const b = Quantity.create(3);

      const result = a.subtract(b);

      expect(result.value).toBe(7);
    });

    it('should subtract to zero', () => {
      const a = Quantity.create(5);
      const b = Quantity.create(5);

      const result = a.subtract(b);

      expect(result.value).toBe(0);
    });

    it('should throw error when result is negative', () => {
      const a = Quantity.create(3);
      const b = Quantity.create(5);

      expect(() => a.subtract(b)).toThrow('Quantity cannot be negative');
    });

    it('should subtract fractional quantities', () => {
      const a = Quantity.create(5.5);
      const b = Quantity.create(2.3);

      const result = a.subtract(b);

      expect(result.value).toBeCloseTo(3.2);
    });
  });

  describe('multiplication', () => {
    it('should multiply Quantity by a positive integer', () => {
      const qty = Quantity.create(5);

      const result = qty.multiply(3);

      expect(result.value).toBe(15);
    });

    it('should multiply Quantity by zero', () => {
      const qty = Quantity.create(10);

      const result = qty.multiply(0);

      expect(result.value).toBe(0);
    });

    it('should multiply Quantity by fractional factor', () => {
      const qty = Quantity.create(10);

      const result = qty.multiply(0.5);

      expect(result.value).toBe(5);
    });

    it('should multiply by 1 and return same value', () => {
      const qty = Quantity.create(7);

      const result = qty.multiply(1);

      expect(result.value).toBe(7);
    });
  });

  describe('comparison - isGreaterThan', () => {
    it('should return true when value is greater', () => {
      const a = Quantity.create(10);
      const b = Quantity.create(5);

      expect(a.isGreaterThan(b)).toBe(true);
    });

    it('should return false when values are equal', () => {
      const a = Quantity.create(5);
      const b = Quantity.create(5);

      expect(a.isGreaterThan(b)).toBe(false);
    });

    it('should return false when value is less', () => {
      const a = Quantity.create(3);
      const b = Quantity.create(5);

      expect(a.isGreaterThan(b)).toBe(false);
    });
  });

  describe('comparison - equals', () => {
    it('should return true for same values', () => {
      const a = Quantity.create(10);
      const b = Quantity.create(10);

      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different values', () => {
      const a = Quantity.create(10);
      const b = Quantity.create(5);

      expect(a.equals(b)).toBe(false);
    });

    it('should return true for two zero quantities', () => {
      const a = Quantity.zero();
      const b = Quantity.zero();

      expect(a.equals(b)).toBe(true);
    });
  });

  describe('immutability', () => {
    it('should not mutate original Quantity on add', () => {
      const original = Quantity.create(5);
      const other = Quantity.create(3);

      original.add(other);

      expect(original.value).toBe(5);
    });

    it('should not mutate original Quantity on subtract', () => {
      const original = Quantity.create(10);
      const other = Quantity.create(3);

      original.subtract(other);

      expect(original.value).toBe(10);
    });

    it('should not mutate original Quantity on multiply', () => {
      const original = Quantity.create(5);

      original.multiply(3);

      expect(original.value).toBe(5);
    });
  });
});
