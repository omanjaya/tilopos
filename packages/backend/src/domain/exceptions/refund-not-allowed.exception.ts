import { BusinessError } from '@shared/errors';
import { ErrorCode } from '@shared/constants';

export class RefundNotAllowedException extends BusinessError {
  constructor(reason: string) {
    super(ErrorCode.REFUND_NOT_ALLOWED, `Refund not allowed: ${reason}`);
  }
}
