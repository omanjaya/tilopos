import { Inject, Injectable } from '@nestjs/common';
import type { ITableRepository } from '../../../domain/interfaces/repositories/table.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';
import { AppError } from '../../../shared/errors/app-error';
import { ErrorCode } from '../../../shared/constants/error-codes';

export interface UpdateTableStatusParams {
  tableId: string;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  currentOrderId?: string;
}

@Injectable()
export class UpdateTableStatusUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.TABLE)
    private readonly tableRepo: ITableRepository,
  ) {}

  async execute(params: UpdateTableStatusParams) {
    const existing = await this.tableRepo.findById(params.tableId);
    if (!existing) {
      throw new AppError(ErrorCode.TABLE_NOT_FOUND, 'Table not found');
    }

    return this.tableRepo.updateStatus(params.tableId, params.status, params.currentOrderId);
  }
}
