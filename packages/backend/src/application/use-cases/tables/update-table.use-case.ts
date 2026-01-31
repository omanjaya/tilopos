import { Inject, Injectable } from '@nestjs/common';
import type { ITableRepository } from '../../../domain/interfaces/repositories/table.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';
import { AppError } from '../../../shared/errors/app-error';
import { ErrorCode } from '../../../shared/constants/error-codes';

export interface UpdateTableParams {
  id: string;
  name?: string;
  capacity?: number;
  section?: string;
  positionX?: number;
  positionY?: number;
  status?: 'available' | 'occupied' | 'reserved' | 'cleaning';
  isActive?: boolean;
}

@Injectable()
export class UpdateTableUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.TABLE)
    private readonly tableRepo: ITableRepository,
  ) {}

  async execute(params: UpdateTableParams) {
    const existing = await this.tableRepo.findById(params.id);
    if (!existing) {
      throw new AppError(ErrorCode.TABLE_NOT_FOUND, 'Table not found');
    }

    return this.tableRepo.update(params.id, {
      ...(params.name !== undefined && { name: params.name }),
      ...(params.capacity !== undefined && { capacity: params.capacity }),
      ...(params.section !== undefined && { section: params.section }),
      ...(params.positionX !== undefined && { positionX: params.positionX }),
      ...(params.positionY !== undefined && { positionY: params.positionY }),
      ...(params.status !== undefined && { status: params.status }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
    });
  }
}
