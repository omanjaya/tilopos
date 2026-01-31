import { Inject, Injectable } from '@nestjs/common';
import type { ITableRepository } from '../../../domain/interfaces/repositories/table.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';
import { AppError } from '../../../shared/errors/app-error';
import { ErrorCode } from '../../../shared/constants/error-codes';

export interface CreateTableParams {
  outletId: string;
  name: string;
  capacity?: number;
  section?: string;
  positionX?: number;
  positionY?: number;
}

@Injectable()
export class CreateTableUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.TABLE)
    private readonly tableRepo: ITableRepository,
  ) {}

  async execute(params: CreateTableParams): Promise<TableRecord> {
    const existing = await this.tableRepo.findByOutlet(params.outletId);
    const duplicate = existing.find((t) => t.name === params.name);

    if (duplicate) {
      throw new AppError(ErrorCode.DUPLICATE_TABLE, 'Table with this name already exists');
    }

    return this.tableRepo.create({
      outletId: params.outletId,
      name: params.name,
      capacity: params.capacity,
      section: params.section,
      positionX: params.positionX,
      positionY: params.positionY,
    });
  }
}

type TableRecord = ReturnType<typeof import('../../../infrastructure/repositories/prisma-table.repository')['PrismaTableRepository']['prototype']['toRecord']>;
