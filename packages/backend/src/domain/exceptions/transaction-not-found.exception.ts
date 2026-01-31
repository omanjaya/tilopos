import { AppError } from '@shared/errors';
import { ErrorCode } from '@shared/constants';
import { HttpStatus } from '@nestjs/common';

export class TransactionNotFoundException extends AppError {
  constructor(id: string) {
    super(ErrorCode.TRANSACTION_NOT_FOUND, `Transaction ${id} not found`, HttpStatus.NOT_FOUND);
  }
}
