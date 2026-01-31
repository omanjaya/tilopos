import { VoidNotAllowedException } from '../void-not-allowed.exception';
import { HttpStatus } from '@nestjs/common';

describe('VoidNotAllowedException', () => {
  it('should create exception with correct message', () => {
    const exception = new VoidNotAllowedException('Transaction is already voided');

    expect(exception.message).toBe('Transaction void not allowed: Transaction is already voided');
  });

  it('should have VOID_NOT_ALLOWED code', () => {
    const exception = new VoidNotAllowedException('some reason');

    expect(exception.code).toBe('VOID_NOT_ALLOWED');
  });

  it('should have FORBIDDEN status code (403)', () => {
    const exception = new VoidNotAllowedException('some reason');

    expect(exception.statusCode).toBe(HttpStatus.FORBIDDEN);
  });

  it('should extend Error', () => {
    const exception = new VoidNotAllowedException('some reason');

    expect(exception).toBeInstanceOf(Error);
  });

  it('should include reason in message', () => {
    const exception = new VoidNotAllowedException('Cannot void a refunded transaction');

    expect(exception.message).toContain('Cannot void a refunded transaction');
  });

  it('should prefix message with "Transaction void not allowed:"', () => {
    const exception = new VoidNotAllowedException('any reason');

    expect(exception.message).toMatch(/^Transaction void not allowed:/);
  });

  it('should have correct name from Error class', () => {
    const exception = new VoidNotAllowedException('reason');

    expect(exception.name).toBe('Error');
  });
});
