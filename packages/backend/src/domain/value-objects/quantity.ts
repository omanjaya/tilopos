import { AppError, ErrorCode } from '../../shared/errors/app-error';

export class Quantity {
  private constructor(private readonly _value: number) {
    if (_value < 0) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Quantity cannot be negative',
      );
    }
  }

  static create(value: number): Quantity {
    return new Quantity(value);
  }

  static zero(): Quantity {
    return new Quantity(0);
  }

  get value(): number {
    return this._value;
  }

  add(other: Quantity): Quantity {
    return new Quantity(this._value + other._value);
  }

  subtract(other: Quantity): Quantity {
    return new Quantity(this._value - other._value);
  }

  multiply(factor: number): Quantity {
    return new Quantity(this._value * factor);
  }

  isGreaterThan(other: Quantity): boolean {
    return this._value > other._value;
  }

  equals(other: Quantity): boolean {
    return this._value === other._value;
  }
}
