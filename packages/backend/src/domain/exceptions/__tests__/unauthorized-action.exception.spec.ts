import { UnauthorizedActionException } from '../unauthorized-action.exception';
import { AppError } from '@shared/errors/app-error';
import { ErrorCode } from '@shared/constants/error-codes';

describe('UnauthorizedActionException', () => {
  it('should create exception with correct message', () => {
    const exception = new UnauthorizedActionException('void_transaction');

    expect(exception.message).toBe('Unauthorized to perform: void_transaction');
  });

  it('should have UNAUTHORIZED_ACTION error code', () => {
    const exception = new UnauthorizedActionException('void_transaction');

    expect(exception.code).toBe(ErrorCode.UNAUTHORIZED_ACTION);
  });

  it('should extend AppError', () => {
    const exception = new UnauthorizedActionException('void_transaction');

    expect(exception).toBeInstanceOf(AppError);
  });

  it('should have 403 status code (FORBIDDEN)', () => {
    const exception = new UnauthorizedActionException('void_transaction');

    expect(exception.getStatus()).toBe(403);
  });

  it('should include action name in message', () => {
    const exception = new UnauthorizedActionException('manage_employees');

    expect(exception.message).toContain('manage_employees');
  });
});
