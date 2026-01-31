import { Inject, Injectable } from '@nestjs/common';
import type { ITableRepository } from '../../../domain/interfaces/repositories/table.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';

export interface GetTablesParams {
  outletId: string;
  section?: string;
  status?: 'available' | 'occupied' | 'reserved' | 'cleaning';
  activeOnly?: boolean;
}

@Injectable()
export class GetTablesUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.TABLE)
    private readonly tableRepo: ITableRepository,
  ) {}

  async execute(params: GetTablesParams) {
    if (params.section) {
      return this.tableRepo.findBySection(params.outletId, params.section);
    }

    if (params.status) {
      return this.tableRepo.findByStatus(params.outletId, params.status);
    }

    return this.tableRepo.findByOutlet(params.outletId, params.activeOnly);
  }
}
