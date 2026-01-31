import { AppError } from '@shared/errors';
import { ErrorCode } from '@shared/constants';
import { HttpStatus } from '@nestjs/common';

export class UnauthorizedActionException extends AppError {
  constructor(action: string) {
    super(ErrorCode.UNAUTHORIZED_ACTION, `Unauthorized to perform: ${action}`, HttpStatus.FORBIDDEN);
  }
}
