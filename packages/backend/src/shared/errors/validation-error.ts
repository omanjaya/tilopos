import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';
import { AppError } from './app-error';

export class ValidationError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.INVALID_PAYMENT) {
    super(code, message, HttpStatus.BAD_REQUEST);
  }
}
