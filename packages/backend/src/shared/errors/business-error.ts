import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';
import { AppError } from './app-error';

export class BusinessError extends AppError {
  constructor(code: ErrorCode, message: string) {
    super(code, message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}
