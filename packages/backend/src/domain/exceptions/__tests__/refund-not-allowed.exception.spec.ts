import { RefundNotAllowedException } from '../refund-not-allowed.exception';
import { BusinessError } from '@shared/errors/business-error';
import { AppError } from '@shared/errors/app-error';
import { ErrorCode } from '@shared/constants/error-codes';

describe('RefundNotAllowedException', () => {
  it('should create exception with correct message', () => {
    const exception = new RefundNotAllowedException('Transaction already refunded');

    expect(exception.message).toBe('Refund not allowed: Transaction already refunded');
  });

  it('should have REFUND_NOT_ALLOWED error code', () => {
    const exception = new RefundNotAllowedException('some reason');

    expect(exception.code).toBe(ErrorCode.REFUND_NOT_ALLOWED);
  });

  it('should extend BusinessError', () => {
    const exception = new RefundNotAllowedException('some reason');

    expect(exception).toBeInstanceOf(BusinessError);
  });

  it('should extend AppError', () => {
    const exception = new RefundNotAllowedException('some reason');

    expect(exception).toBeInstanceOf(AppError);
  });

  it('should have 422 status code (UNPROCESSABLE_ENTITY from BusinessError)', () => {
    const exception = new RefundNotAllowedException('some reason');

    expect(exception.getStatus()).toBe(422);
  });

  it('should include reason in message', () => {
    const exception = new RefundNotAllowedException('Refund window expired');

    expect(exception.message).toContain('Refund window expired');
  });

  it('should prefix message with "Refund not allowed:"', () => {
    const exception = new RefundNotAllowedException('any reason');

    expect(exception.message).toMatch(/^Refund not allowed:/);
  });
});
