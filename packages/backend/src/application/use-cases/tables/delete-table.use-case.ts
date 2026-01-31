import { Inject, Injectable } from '@nestjs/common';
import type { ITableRepository } from '../../../domain/interfaces/repositories/table.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';
import { AppError } from '../../../shared/errors/app-error';
import { ErrorCode } from '../../../shared/constants/error-codes';

@Injectable()
export class DeleteTableUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.TABLE)
    private readonly tableRepo: ITableRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.tableRepo.findById(id);
    if (!existing) {
      throw new AppError(ErrorCode.TABLE_NOT_FOUND, 'Table not found');
    }

    if (existing.status === 'occupied') {
      throw new AppError(ErrorCode.TABLE_OCCUPIED, 'Cannot delete an occupied table');
    }

    await this.tableRepo.delete(id);
  }
}
