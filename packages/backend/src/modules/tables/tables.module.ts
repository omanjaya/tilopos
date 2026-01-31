import { Module } from '@nestjs/common';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaTableRepository } from '../../infrastructure/repositories/prisma-table.repository';
import { PrismaTransactionRepository } from '../../infrastructure/repositories/prisma-transaction.repository';

// Use Cases - Table CRUD
import { CreateTableUseCase } from '../../application/use-cases/tables/create-table.use-case';
import { GetTablesUseCase } from '../../application/use-cases/tables/get-tables.use-case';
import { UpdateTableUseCase } from '../../application/use-cases/tables/update-table.use-case';
import { DeleteTableUseCase } from '../../application/use-cases/tables/delete-table.use-case';
import { UpdateTableStatusUseCase } from '../../application/use-cases/tables/update-table-status.use-case';

// Use Cases - Bill Operations
import { SplitBillUseCase } from '../../application/use-cases/tables/split-bill.use-case';
import { MergeBillUseCase } from '../../application/use-cases/tables/merge-bill.use-case';

@Module({
  controllers: [TablesController],
  providers: [
    // Services
    TablesService,

    // Repositories
    { provide: REPOSITORY_TOKENS.TABLE, useClass: PrismaTableRepository },
    { provide: REPOSITORY_TOKENS.TRANSACTION, useClass: PrismaTransactionRepository },

    // Use Cases - Table CRUD
    CreateTableUseCase,
    GetTablesUseCase,
    UpdateTableUseCase,
    DeleteTableUseCase,
    UpdateTableStatusUseCase,

    // Use Cases - Bill Operations
    SplitBillUseCase,
    MergeBillUseCase,
  ],
  exports: [
    UpdateTableStatusUseCase,
    TablesService,
  ],
})
export class TablesModule {}
