import { InsufficientStockException } from '../insufficient-stock.exception';
import { BusinessError } from '@shared/errors/business-error';
import { AppError } from '@shared/errors/app-error';
import { ErrorCode } from '@shared/constants/error-codes';

describe('InsufficientStockException', () => {
  it('should create exception with correct message', () => {
    const exception = new InsufficientStockException('prod-1', 5, 10);

    expect(exception.message).toBe(
      'Insufficient stock for product prod-1: available 5, requested 10',
    );
  });

  it('should have INSUFFICIENT_STOCK error code', () => {
    const exception = new InsufficientStockException('prod-1', 5, 10);

    expect(exception.code).toBe(ErrorCode.INSUFFICIENT_STOCK);
  });

  it('should extend BusinessError', () => {
    const exception = new InsufficientStockException('prod-1', 5, 10);

    expect(exception).toBeInstanceOf(BusinessError);
  });

  it('should extend AppError', () => {
    const exception = new InsufficientStockException('prod-1', 5, 10);

    expect(exception).toBeInstanceOf(AppError);
  });

  it('should have 422 status code (UNPROCESSABLE_ENTITY from BusinessError)', () => {
    const exception = new InsufficientStockException('prod-1', 5, 10);

    expect(exception.getStatus()).toBe(422);
  });

  it('should include product ID in message', () => {
    const exception = new InsufficientStockException('product-abc', 3, 7);

    expect(exception.message).toContain('product-abc');
  });

  it('should include available quantity in message', () => {
    const exception = new InsufficientStockException('prod-1', 3, 7);

    expect(exception.message).toContain('available 3');
  });

  it('should include requested quantity in message', () => {
    const exception = new InsufficientStockException('prod-1', 3, 7);

    expect(exception.message).toContain('requested 7');
  });

  it('should handle zero available stock', () => {
    const exception = new InsufficientStockException('prod-1', 0, 5);

    expect(exception.message).toBe(
      'Insufficient stock for product prod-1: available 0, requested 5',
    );
  });
});
