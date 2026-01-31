import { HttpStatus } from '@nestjs/common';

export class VoidNotAllowedException extends Error {
  public readonly statusCode = HttpStatus.FORBIDDEN;
  public readonly code = 'VOID_NOT_ALLOWED';

  constructor(reason: string) {
    super(`Transaction void not allowed: ${reason}`);
  }
}
