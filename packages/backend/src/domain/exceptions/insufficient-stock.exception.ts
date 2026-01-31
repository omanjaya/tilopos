import { BusinessError } from '@shared/errors';
import { ErrorCode } from '@shared/constants';

export class InsufficientStockException extends BusinessError {
  constructor(productId: string, available: number, requested: number) {
    super(
      ErrorCode.INSUFFICIENT_STOCK,
      `Insufficient stock for product ${productId}: available ${available}, requested ${requested}`,
    );
  }
}
