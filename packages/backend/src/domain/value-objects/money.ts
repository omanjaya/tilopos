import { AppError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/constants/error-codes';

export class Money {
  private constructor(
    private readonly _amount: number,
    private readonly _currency: string = 'IDR',
  ) {
    if (_amount < 0) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Money amount cannot be negative',
      );
    }
  }

  static create(amount: number, currency: string = 'IDR'): Money {
    return new Money(amount, currency);
  }

  static zero(currency: string = 'IDR'): Money {
    return new Money(0, currency);
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this._amount - other._amount, this._currency);
  }

  multiply(factor: number): Money {
    return new Money(Math.round(this._amount * factor), this._currency);
  }

  isGreaterThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this._amount > other._amount;
  }

  isLessThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this._amount < other._amount;
  }

  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  private ensureSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Currency mismatch: ${this._currency} vs ${other._currency}`,
      );
    }
  }
}
