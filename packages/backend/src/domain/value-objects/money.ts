import type { Prisma } from '@prisma/client';
import { AppError } from '../../shared/errors/app-error';
import { ErrorCode } from '../../shared/constants/error-codes';
import { money, roundRupiah, type MoneyInput } from '../../shared/utils/money';

/**
 * Immutable, non-negative money amount. The value is held as Prisma.Decimal so add/subtract
 * never accumulate float drift (R8); `amount` exposes a number only for API/legacy callers.
 */
export class Money {
  private readonly _amount: Prisma.Decimal;

  private constructor(
    amount: MoneyInput,
    private readonly _currency: string = 'IDR',
  ) {
    this._amount = money(amount);
    if (this._amount.isNegative()) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Money amount cannot be negative');
    }
  }

  static create(amount: MoneyInput, currency: string = 'IDR'): Money {
    return new Money(amount, currency);
  }

  static zero(currency: string = 'IDR'): Money {
    return new Money(0, currency);
  }

  /** Number view for responses; do not use it for further arithmetic. */
  get amount(): number {
    return this._amount.toNumber();
  }

  /** Exact decimal value, for arithmetic and persistence. */
  get decimal(): Prisma.Decimal {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this._amount.plus(other._amount), this._currency);
  }

  subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this._amount.minus(other._amount), this._currency);
  }

  /** Multiplies and rounds to whole rupiah (ROUND_HALF_UP). */
  multiply(factor: MoneyInput): Money {
    return new Money(roundRupiah(this._amount.times(money(factor))), this._currency);
  }

  isGreaterThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this._amount.greaterThan(other._amount);
  }

  isLessThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this._amount.lessThan(other._amount);
  }

  equals(other: Money): boolean {
    return this._amount.equals(other._amount) && this._currency === other._currency;
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
