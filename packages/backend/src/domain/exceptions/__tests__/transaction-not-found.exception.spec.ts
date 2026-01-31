import { TransactionNotFoundException } from '../transaction-not-found.exception';
import { AppError } from '@shared/errors/app-error';
import { ErrorCode } from '@shared/constants/error-codes';

describe('TransactionNotFoundException', () => {
  it('should create exception with correct message', () => {
    const exception = new TransactionNotFoundException('txn-123');

    expect(exception.message).toBe('Transaction txn-123 not found');
  });

  it('should have TRANSACTION_NOT_FOUND error code', () => {
    const exception = new TransactionNotFoundException('txn-123');

    expect(exception.code).toBe(ErrorCode.TRANSACTION_NOT_FOUND);
  });

  it('should extend AppError', () => {
    const exception = new TransactionNotFoundException('txn-123');

    expect(exception).toBeInstanceOf(AppError);
  });

  it('should have 404 status code (NOT_FOUND)', () => {
    const exception = new TransactionNotFoundException('txn-123');

    expect(exception.getStatus()).toBe(404);
  });

  it('should include transaction ID in message', () => {
    const exception = new TransactionNotFoundException('abc-def-ghi');

    expect(exception.message).toContain('abc-def-ghi');
  });
});
